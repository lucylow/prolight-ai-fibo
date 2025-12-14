export default function CareersPage() {
  const roles = [
    {
      title: "Frontend Engineer (React)",
      location: "Remote",
      desc: "Build professional-grade creative tools used by photographers and studios."
    },
    {
      title: "Applied ML Engineer",
      location: "Remote / Hybrid",
      desc: "Work on structured generation, evaluation, and controllability for AI models."
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
      <h1 className="text-4xl font-bold mb-6">Careers</h1>
      <p className="text-gray-600 mb-12">
        We're building tools for professionals. Join us if you care about quality,
        reproducibility, and real-world impact.
      </p>

      <div className="space-y-6">
        {roles.map(role => (
          <div key={role.title} className="border rounded-xl p-6">
            <h3 className="text-lg font-semibold">{role.title}</h3>
            <p className="text-sm text-gray-500">{role.location}</p>
            <p className="text-gray-600 mt-2">{role.desc}</p>
            <button className="mt-4 text-teal-600 font-medium">
              Apply →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
