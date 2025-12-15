import React, { useEffect, useState } from "react";
import axios from "axios";
import { SEO } from "@/components/SEO";
import { toast } from "react-toastify";
import RecaptchaWrapper from "@/components/RecaptchaWrapper";
import { getPresign, uploadToS3 } from "@/api/upload";

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

type Job = { id: string; title: string; location: string; description: string };

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [app, setApp] = useState({ 
    jobId: "", 
    name: "", 
    email: "", 
    resumeUrl: "", 
    message: "" 
  });
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Get jobs from backend (which proxies Greenhouse or from local CMS)
    axios.get("/api/careers/jobs")
      .then(r => setJobs(r.data))
      .catch(err => {
        console.error("Failed to load jobs:", err);
        // Fallback to local jobs
        setJobs([
          { id: "frontend-engineer", title: "Frontend Engineer (React)", location: "Remote", description: "Build ProLight UI" },
          { id: "ml-engineer", title: "Applied ML Engineer", location: "Remote", description: "Work on FIBO tailored models" }
        ]);
      });
  }, []);

  async function handleResumeSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setUploading(true);
    setUploadProgress(0);

    try {
      const presign = await getPresign(file.name, file.type);
      await uploadToS3(presign.upload_url, file, (progress) => {
        setUploadProgress(progress);
      });
      setApp(prev => ({ ...prev, resumeUrl: presign.public_url }));
      toast.success("Resume uploaded successfully");
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : "Unknown error";
      toast.error("Failed to upload resume: " + errorMessage);
    } finally {
      setUploading(false);
    }
  }

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    
    if (!recaptchaToken) {
      toast.error("Please complete the reCAPTCHA verification");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/careers/apply", {
        ...app,
        recaptchaToken
      });
      toast.success("Application submitted — thanks!");
      setApp({ jobId: "", name: "", email: "", resumeUrl: "", message: "" });
      setRecaptchaToken(null);
      setResumeFile(null);
      setUploadProgress(0);
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err.response as { data?: { detail?: string } })?.data?.detail 
        : undefined;
      toast.error(errorMessage || "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SEO title="Careers" description="Join ProLight AI — openings in engineering, ML, product." />
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-6">Careers</h1>
        <p className="text-muted-foreground mb-12">
          We're building tools for professionals. Join us if you care about quality,
          reproducibility, and real-world impact.
        </p>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Open roles</h2>
            <ul className="space-y-4">
              {jobs.map(j => (
                <li key={j.id} className="p-4 border rounded-lg bg-card">
                  <h3 className="font-medium">{j.title}</h3>
                  <p className="text-sm text-muted-foreground">{j.location}</p>
                  <p className="mt-2 text-muted-foreground">{j.description}</p>
                  <button
                    onClick={() => setApp(prev => ({ ...prev, jobId: j.id }))}
                    className="mt-3 text-primary hover:text-primary/80"
                  >
                    Apply →
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="p-6 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-4">Apply</h3>
            <form onSubmit={apply} className="space-y-3">
              <select
                value={app.jobId}
                onChange={e => setApp({ ...app, jobId: e.target.value })}
                className="w-full border rounded-lg p-2 bg-background"
                required
              >
                <option value="">Choose role…</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              
              <input
                className="w-full border rounded-lg p-2 bg-background"
                placeholder="Full name"
                value={app.name}
                onChange={e => setApp({ ...app, name: e.target.value })}
                required
              />
              
              <input
                type="email"
                className="w-full border rounded-lg p-2 bg-background"
                placeholder="Email"
                value={app.email}
                onChange={e => setApp({ ...app, email: e.target.value })}
                required
              />
              
              <div>
                <label className="block text-sm font-medium mb-1">Resume</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeSelect}
                  className="w-full border rounded-lg p-2 bg-background"
                  disabled={uploading}
                />
                {uploading && (
                  <div className="mt-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
                {app.resumeUrl && !uploading && (
                  <p className="text-xs text-green-600 mt-1">✓ Resume uploaded</p>
                )}
              </div>
              
              <textarea
                className="w-full border rounded-lg p-2 bg-background"
                placeholder="Short message (optional)"
                value={app.message}
                onChange={e => setApp({ ...app, message: e.target.value })}
                rows={4}
              />
              
              {SITE_KEY && (
                <div className="py-2">
                  <RecaptchaWrapper
                    siteKey={SITE_KEY}
                    onVerify={(token) => setRecaptchaToken(token)}
                  />
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                disabled={loading || uploading}
              >
                {loading ? "Submitting..." : "Submit application"}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </>
  );
}

