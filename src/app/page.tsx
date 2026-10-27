import Planner from '@/components/planner/Planner';
import { catalog } from '@/lib/ffcs/catalog-data';

export default function Home() {
  const schools = [
    ...new Set(
      catalog.courses.flatMap((course) =>
        course.schools.map((name) => name.replace(/ \('\d\d Batch\)$/, '')),
      ),
    ),
  ].sort();

  return <Planner courseCount={catalog.stats.courses} schools={schools} />;
}
