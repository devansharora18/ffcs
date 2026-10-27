import Planner from '@/components/planner/Planner';
import { catalog } from '@/lib/ffcs/catalog-data';

export default function Home() {
  return <Planner courseCount={catalog.stats.courses} />;
}
