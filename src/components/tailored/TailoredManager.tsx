/**
 * Comprehensive Tailored Generation Manager
 * 
 * Features:
 * - Create and manage Projects
 * - Create and manage Datasets
 * - Upload images and register to datasets
 * - Generate advanced caption prefix
 * - Create models and start training
 * - Generate images with tailored models (ControlNet, Image Prompt Adapter)
 * - Monitor job status
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Upload, Image as ImageIcon, Play, CheckCircle2, XCircle } from 'lucide-react';
import {
  createProject,
  listProjects,
  createDataset,
  listDatasets,
  generatePrefix,
  uploadImageAndRegister,
  createModel,
  listModels,
  startTraining,
  generateImage,
  reimagine,
  listJobs,
  getJob,
  type Project,
  type Dataset,
  type Model,
  type TailoredJob,
  type GuidanceMethod,
} from '@/api/tailored-generation';
import { mockProjects, mockDatasets, mockModels, mockJobs, shouldUseMockData } from '@/services/enhancedMockData';

export default function TailoredManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [jobs, setJobs] = useState<TailoredJob[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPrefix, setGeneratedPrefix] = useState<unknown>(null);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [projectIpType, setProjectIpType] = useState('stylized_scene');
  const [projectMedium, setProjectMedium] = useState('photograph');
  const [datasetName, setDatasetName] = useState('');
  const [modelName, setModelName] = useState('');
  const [trainingMode, setTrainingMode] = useState<'fully_automated' | 'expert'>('fully_automated');
  const [trainingVersion, setTrainingVersion] = useState<'light' | 'max'>('light');
  const [prompt, setPrompt] = useState('A dramatic studio product shot of a watch');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [sampleImageUrls, setSampleImageUrls] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generationResult, setGenerationResult] = useState<{ url?: string } | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [proj, ds, md, jb] = await Promise.all([
        listProjects(),
        listDatasets(),
        listModels(),
        listJobs(),
      ]);
      setProjects(proj);
      setDatasets(ds);
      setModels(md);
      setJobs(jb);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Use mock data if API fails and mock data is enabled
      if (shouldUseMockData()) {
        setProjects(mockProjects);
        setDatasets(mockDatasets);
        setModels(mockModels);
        setJobs(mockJobs);
        console.log('Using mock data for TailoredManager');
      } else {
        toast.error('Failed to load data');
      }
    }
  }

  async function handleCreateProject() {
    if (!projectName) {
      toast.error('Project name is required');
      return;
    }
    setIsLoading(true);
    try {
      const project = await createProject({
        name: projectName,
        ip_type: projectIpType,
        medium: projectMedium,
      });
      toast.success('Project created!');
      setProjectName('');
      await fetchAll();
      setSelectedProject(project.bria_id || project.id);
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateDataset() {
    if (!selectedProject || !datasetName) {
      toast.error('Project and dataset name are required');
      return;
    }
    setIsLoading(true);
    try {
      const dataset = await createDataset(selectedProject, {
        name: datasetName,
        description: 'Created from ProLight',
      });
      toast.success('Dataset created!');
      setDatasetName('');
      await fetchAll();
      setSelectedDataset(dataset.bria_id || dataset.id);
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || 'Failed to create dataset');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUploadImage() {
    if (!imageFile || !selectedDataset) {
      toast.error('Please select a file and dataset');
      return;
    }
    setIsLoading(true);
    setUploadProgress(0);
    try {
      await uploadImageAndRegister(
        imageFile,
        selectedDataset,
        undefined,
        (progress) => {
          setUploadProgress(progress);
        }
      );
      toast.success('Image uploaded and registered!');
      setImageFile(null);
      await fetchAll();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || 'Failed to upload image');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }

  async function handleGeneratePrefix() {
    if (!selectedDataset) {
      toast.error('Please select a dataset');
      return;
    }
    const urls = sampleImageUrls.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);
    if (urls.length === 0) {
      toast.error('Please provide at least one sample image URL');
      return;
    }
    setIsLoading(true);
    try {
      const prefix = await generatePrefix(selectedDataset, urls);
      setGeneratedPrefix(prefix);
      toast.success('Prefix generated!');
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || 'Failed to generate prefix');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateModel() {
    if (!selectedDataset || !modelName) {
      toast.error('Dataset and model name are required');
      return;
    }
    setIsLoading(true);
    try {
      const model = await createModel({
        dataset_id: selectedDataset,
        name: modelName,
        training_mode: trainingMode,
        training_version: trainingVersion,
      });
      toast.success('Model created!');
      setModelName('');
      await fetchAll();
      setSelectedModel(model.bria_id || model.id);
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || 'Failed to create model');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartTraining() {
    if (!selectedModel) {
      toast.error('Please select a model');
      return;
    }
    setIsLoading(true);
    try {
      const result = await startTraining(selectedModel);
      toast.success('Training started!');
      await fetchAll();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || 'Failed to start training');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedModel || !prompt) {
      toast.error('Model and prompt are required');
      return;
    }
    setIsLoading(true);
    setGenerationResult(null);
    try {
      const result = await generateImage({
        model_id: selectedModel,
        prompt,
        negative_prompt: negativePrompt || undefined,
        steps: 30,
        num_images: 1,
      });
      
      if (result.request_id) {
        toast.success('Generation started! Check jobs for status.');
        // Poll for result
        setTimeout(() => pollJob(result.request_id), 2000);
      } else {
        setGenerationResult(result as { url?: string });
        toast.success('Image generated!');
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' 
        ? ('response' in error 
          ? (error.response as { data?: { error?: string } })?.data?.error 
          : 'message' in error 
            ? String(error.message) 
            : undefined)
        : undefined;
      toast.error(errorMessage || 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  }

  async function pollJob(requestId: string) {
    try {
      const job = await getJob(requestId);
      if (job.status === 'succeeded' && job.result?.url) {
        setGenerationResult({ url: job.result.url });
        toast.success('Generation completed!');
        await fetchAll();
      } else if (job.status === 'failed') {
        toast.error('Generation failed');
        await fetchAll();
      } else {
        // Poll again after 3 seconds
        setTimeout(() => pollJob(requestId), 3000);
      }
    } catch (error) {
      console.error('Failed to poll job:', error);
    }
  }

  const filteredDatasets = selectedProject
    ? datasets.filter(d => d.project_id === selectedProject)
    : datasets;

  const filteredModels = selectedDataset
    ? models.filter(m => m.dataset_id === selectedDataset)
    : models;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tailored Generation Manager</h1>
        <p className="text-muted-foreground">
          Manage projects, datasets, models, and generate images with tailored models
        </p>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Project</CardTitle>
              <CardDescription>Create a new tailored generation project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Product Photography Project"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip-type">IP Type</Label>
                <Select value={projectIpType} onValueChange={setProjectIpType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stylized_scene">Stylized Scene</SelectItem>
                    <SelectItem value="defined_character">Defined Character</SelectItem>
                    <SelectItem value="object_variants">Object Variants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium">Medium</Label>
                <Select value={projectMedium} onValueChange={setProjectMedium}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photograph">Photograph</SelectItem>
                    <SelectItem value="illustration">Illustration</SelectItem>
                    <SelectItem value="3d">3D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateProject} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 border rounded cursor-pointer hover:bg-muted ${
                      selectedProject === (p.bria_id || p.id) ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedProject(p.bria_id || p.id)}
                  >
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {p.ip_type} • {p.medium}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datasets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Dataset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-select">Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.bria_id || p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataset-name">Dataset Name</Label>
                <Input
                  id="dataset-name"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="Product Images Dataset"
                />
              </div>
              <Button onClick={handleCreateDataset} disabled={isLoading || !selectedProject}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Dataset
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dataset-select">Dataset</Label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDatasets.map((d) => (
                      <SelectItem key={d.id} value={d.bria_id || d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-file">Image File</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </div>
              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <div className="text-sm text-muted-foreground">{uploadProgress}%</div>
                </div>
              )}
              <Button onClick={handleUploadImage} disabled={isLoading || !selectedDataset || !imageFile}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" />
                Upload & Register
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Advanced Prefix</CardTitle>
              <CardDescription>Generate caption prefix from 1-6 sample images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sample-urls">Sample Image URLs (comma-separated)</Label>
                <Textarea
                  id="sample-urls"
                  value={sampleImageUrls}
                  onChange={(e) => setSampleImageUrls(e.target.value)}
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                  rows={3}
                />
              </div>
              <Button onClick={handleGeneratePrefix} disabled={isLoading || !selectedDataset}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Prefix
              </Button>
              {generatedPrefix && (
                <div className="mt-4 p-4 bg-muted rounded">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(generatedPrefix, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-dataset-select">Dataset</Label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((d) => (
                      <SelectItem key={d.id} value={d.bria_id || d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="my_product_model_v1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="training-mode">Training Mode</Label>
                <Select value={trainingMode} onValueChange={(v) => setTrainingMode(v as typeof trainingMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fully_automated">Fully Automated</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="training-version">Training Version</Label>
                <Select value={trainingVersion} onValueChange={(v) => setTrainingVersion(v as typeof trainingVersion)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="max">Max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateModel} disabled={isLoading || !selectedDataset}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Model
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Start Training</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-select">Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredModels.map((m) => (
                      <SelectItem key={m.id} value={m.bria_id || m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleStartTraining} disabled={isLoading || !selectedModel}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Play className="mr-2 h-4 w-4" />
                Start Training
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {models.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 border rounded cursor-pointer hover:bg-muted ${
                      selectedModel === (m.bria_id || m.id) ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedModel(m.bria_id || m.id)}
                  >
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {m.training_mode} • {m.training_version}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gen-model-select">Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.bria_id || m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A dramatic studio product shot of a watch"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="negative-prompt">Negative Prompt (optional)</Label>
                <Textarea
                  id="negative-prompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="blurry, low quality"
                  rows={2}
                />
              </div>
              <Button onClick={handleGenerate} disabled={isLoading || !selectedModel || !prompt}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ImageIcon className="mr-2 h-4 w-4" />
                Generate
              </Button>
              {generationResult?.url && (
                <div className="mt-4">
                  <img
                    src={generationResult.url}
                    alt="Generated"
                    className="max-w-full rounded border"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Jobs</CardTitle>
              <CardDescription>Training and generation jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div key={job.id} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{job.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {job.prompt || job.model_id || 'No details'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === 'succeeded' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {job.status === 'failed' && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {['submitted', 'running', 'queued'].includes(job.status) && (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        )}
                        <span className="text-sm capitalize">{job.status}</span>
                      </div>
                    </div>
                    {job.result?.url && (
                      <div className="mt-2">
                        <img
                          src={job.result.url}
                          alt="Result"
                          className="max-w-xs rounded border"
                        />
                      </div>
                    )}
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No jobs yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

