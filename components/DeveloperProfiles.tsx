import React, { useState, useMemo } from 'react';
import { Developer, Skill, TaskStatus, ProjectStatus } from '../types';

// Mock data for development - will be replaced with real API data
const mockDevelopers: Developer[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'Senior Full Stack Developer',
    level: 'Senior',
    experience: 7,
    location: 'San Francisco, CA',
    timezone: 'PST',
    availability: 'Available',
    projects: ['web-platform', 'mobile-app'],
    rating: 4.8,
    languages: ['JavaScript', 'TypeScript', 'Python'],
    frameworks: ['React', 'Node.js', 'Express', 'Django'],
    tools: ['Git', 'Docker', 'AWS', 'PostgreSQL'],
    preferredTechStack: ['React', 'Node.js', 'MongoDB'],
    github: 'https://github.com/sarahjohnson',
    linkedin: 'https://linkedin.com/in/sarah-johnson-dev',
    bio: 'Passionate about building scalable web applications and mentoring junior developers.',
    hireDate: '2020-01-15',
    department: 'Engineering',
    skills: [
      { name: 'JavaScript', level: 5, category: 'Language', years: 7 },
      { name: 'React', level: 5, category: 'Frontend', years: 5 },
      { name: 'Node.js', level: 4, category: 'Backend', years: 4 },
      { name: 'Python', level: 4, category: 'Language', years: 6 },
      { name: 'AWS', level: 4, category: 'Cloud', years: 3 },
    ],
  },
  {
    id: '2',
    name: 'Mike Chen',
    email: 'mike.chen@company.com',
    role: 'DevOps Engineer',
    level: 'Mid',
    experience: 4,
    location: 'Austin, TX',
    timezone: 'CST',
    availability: 'Available',
    projects: ['infrastructure', 'cicd-pipeline'],
    rating: 4.6,
    languages: ['Python', 'Go', 'Bash'],
    frameworks: ['Terraform', 'Helm', 'Kubernetes'],
    tools: ['Docker', 'Kubernetes', 'Jenkins', 'GitLab CI'],
    preferredTechStack: ['Kubernetes', 'AWS', 'Terraform'],
    github: 'https://github.com/mikechen-devops',
    bio: 'Infrastructure as Code enthusiast with experience in cloud-native technologies.',
    hireDate: '2022-03-10',
    department: 'DevOps',
    skills: [
      { name: 'Docker', level: 5, category: 'Containerization', years: 4 },
      { name: 'Kubernetes', level: 4, category: 'Orchestration', years: 3 },
      { name: 'Terraform', level: 4, category: 'Infrastructure', years: 2 },
      { name: 'AWS', level: 4, category: 'Cloud', years: 3 },
      { name: 'Python', level: 4, category: 'Language', years: 4 },
    ],
  },
  {
    id: '3',
    name: 'Alex Rodriguez',
    email: 'alex.rodriguez@company.com',
    role: 'Frontend Developer',
    level: 'Mid',
    experience: 3,
    location: 'Miami, FL',
    timezone: 'EST',
    availability: 'Busy',
    projects: ['mobile-app'],
    rating: 4.2,
    languages: ['JavaScript', 'TypeScript'],
    frameworks: ['React', 'Vue.js', 'Next.js'],
    tools: ['Figma', 'Adobe XD', 'Git', 'Storybook'],
    preferredTechStack: ['React', 'TypeScript', 'Tailwind CSS'],
    github: 'https://github.com/alexrodriguez',
    bio: 'UI/UX focused developer with a passion for creating beautiful user experiences.',
    hireDate: '2023-01-20',
    department: 'Engineering',
    skills: [
      { name: 'React', level: 4, category: 'Frontend', years: 3 },
      { name: 'TypeScript', level: 4, category: 'Language', years: 2 },
      { name: 'CSS', level: 5, category: 'Styling', years: 5 },
      { name: 'Figma', level: 4, category: 'Design', years: 4 },
      { name: 'Next.js', level: 3, category: 'Framework', years: 1 },
    ],
  },
];

const DeveloperProfiles: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedDeveloper, setSelectedDeveloper] = useState<Developer | null>(null);

  const filteredAndSortedDevelopers = useMemo(() => {
    let filtered = mockDevelopers.filter(dev => {
      const matchesSearch = dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          dev.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          dev.skills.some(skill => skill.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = !filterRole || dev.role.includes(filterRole);
      const matchesLevel = !filterLevel || dev.level === filterLevel;
      const matchesAvailability = !filterAvailability || dev.availability === filterAvailability;
      return matchesSearch && matchesRole && matchesLevel && matchesAvailability;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'experience':
          return b.experience - a.experience;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [searchTerm, filterRole, filterLevel, filterAvailability, sortBy]);

  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return 'text-green-600 bg-green-100';
    if (level >= 3) return 'text-blue-600 bg-blue-100';
    if (level >= 2) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'Available':
        return 'text-green-600 bg-green-100';
      case 'Busy':
        return 'text-yellow-600 bg-yellow-100';
      case 'On Leave':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Junior':
        return 'text-blue-600 bg-blue-100';
      case 'Mid':
        return 'text-green-600 bg-green-100';
      case 'Senior':
        return 'text-orange-600 bg-orange-100';
      case 'Principal':
        return 'text-purple-600 bg-purple-100';
      case 'Staff':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Developer Profiles & Skills</h2>
        <p className="text-gray-400 mb-6">
          Manage developer profiles, track skills, and leverage AI-powered matching
        </p>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <input
              type="text"
              placeholder="Search developers or skills..."
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-4 py-2 focus:ring-cyan-500 focus:border-cyan-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-4 py-2 focus:ring-cyan-500 focus:border-cyan-500"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="Developer">Developer</option>
              <option value="Engineer">Engineer</option>
            </select>
          </div>
          <div>
            <select
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-4 py-2 focus:ring-cyan-500 focus:border-cyan-500"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
            >
              <option value="">All Levels</option>
              <option value="Junior">Junior</option>
              <option value="Mid">Mid</option>
              <option value="Senior">Senior</option>
              <option value="Principal">Principal</option>
              <option value="Staff">Staff</option>
            </select>
          </div>
          <div>
            <select
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-4 py-2 focus:ring-cyan-500 focus:border-cyan-500"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="experience">Sort by Experience</option>
            </select>
          </div>
        </div>

        {/* Developer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedDevelopers.map(developer => (
            <div
              key={developer.id}
              className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-750 transition-colors"
              onClick={() => setSelectedDeveloper(developer)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{developer.name}</h3>
                  <p className="text-sm text-gray-400 mb-2">{developer.role}</p>
                  <div className="flex gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(developer.level)}`}>
                      {developer.level}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(developer.availability)}`}>
                      {developer.availability}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    ⭐ <span className="text-yellow-400 font-medium">{developer.rating}</span>
                  </div>
                  <p className="text-xs text-gray-500">{developer.experience} years</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">TOP SKILLS</p>
                  <div className="flex flex-wrap gap-1">
                    {developer.skills.slice(0, 4).map(skill => (
                      <span
                        key={skill.name}
                        className={`px-2 py-1 rounded text-xs font-medium ${getSkillLevelColor(skill.level)}`}
                      >
                        {skill.name} ({skill.level})
                      </span>
                    ))}
                    {developer.skills.length > 4 && (
                      <span className="px-2 py-1 rounded text-xs font-medium text-gray-400 bg-gray-700">
                        +{developer.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{developer.location}</span>
                  <span className="text-gray-400">{developer.department}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAndSortedDevelopers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No developers found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Developer Detail Modal */}
      {selectedDeveloper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedDeveloper.name}</h3>
                    <p className="text-gray-400">{selectedDeveloper.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(selectedDeveloper.level)}`}>
                      {selectedDeveloper.level}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAvailabilityColor(selectedDeveloper.availability)}`}>
                      {selectedDeveloper.availability}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDeveloper(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Bio */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">About</h4>
                <p className="text-gray-300">{selectedDeveloper.bio}</p>
              </div>

              {/* Skills Section */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Skills & Expertise</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedDeveloper.skills.map(skill => (
                    <div key={skill.name} className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{skill.name}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSkillLevelColor(skill.level)}`}>
                          Level {skill.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>📂 {skill.category}</span>
                        <span>⏰ {skill.years} years</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Technology Stack</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Languages</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedDeveloper.languages.map(lang => (
                        <span key={lang} className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Frameworks</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedDeveloper.frameworks.map(fw => (
                        <span key={fw} className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Tools</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedDeveloper.tools.map(tool => (
                        <span key={tool} className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Projects & Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Current Projects</h4>
                  <div className="space-y-2">
                    {selectedDeveloper.projects.map(project => (
                      <div key={project} className="bg-gray-800 p-3 rounded">
                        <span className="text-gray-300">{project}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Links & Contact</h4>
                  <div className="space-y-2">
                    {selectedDeveloper.github && (
                      <a href={selectedDeveloper.github} className="text-blue-400 hover:text-blue-300 block">
                        🐙 GitHub
                      </a>
                    )}
                    {selectedDeveloper.linkedin && (
                      <a href={selectedDeveloper.linkedin} className="text-blue-400 hover:text-blue-300 block">
                        💼 LinkedIn
                      </a>
                    )}
                    <a href={`mailto:${selectedDeveloper.email}`} className="text-green-400 hover:text-green-300 block">
                      📧 {selectedDeveloper.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperProfiles;
