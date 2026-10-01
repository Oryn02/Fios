import React from 'react';
import { Users } from 'lucide-react';
import { FriendManager } from './FriendManager';
import { CourseDirectory } from './CourseDirectory';
import { ClassroomDashboard } from '../analytics/ClassroomDashboard';

export const SocialHub: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header>
        <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 accent-solid-text" /> Study Network
        </h2>
        <p className="text-xs font-mono text-[var(--fios-text-muted)] mt-1">
          Friends · course bank · classrooms
        </p>
      </header>
      <div className="grid lg:grid-cols-2 gap-4">
        <FriendManager />
        <CourseDirectory />
      </div>
      <ClassroomDashboard />
    </div>
  );
};
