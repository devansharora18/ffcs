'use client';

type Props = {
  schools: string[];
  onChoose: (school: string) => void;
};

export default function Onboarding({ schools, onChoose }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl rounded-bl-sm bg-panel-2 px-3 py-2 text-[13px] leading-relaxed">
        Hi. Tell me your school and the courses you want, and I&apos;ll build the timetable.
      </div>

      <div className="flex flex-wrap gap-1.5">
        {schools.map((school) => (
          <button
            key={school}
            type="button"
            onClick={() => onChoose(school)}
            className="rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-lime hover:text-lime"
          >
            {school}
          </button>
        ))}
      </div>
    </div>
  );
}
