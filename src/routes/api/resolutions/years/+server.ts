
import { json } from '@sveltejs/kit';
import { getDefaultConnection, ResolutionRepository } from "../../../../reader/models";

export async function GET() {
  const dataSource = await getDefaultConnection();
  const resolutionRepo = ResolutionRepository.createInstance(dataSource);

  const earliestYear = await resolutionRepo.earliestYear();
  const latestYear = await resolutionRepo.latestYear();

  const years = [];
  for (let year = earliestYear; year <= latestYear; year++) {
    years.push(year);
  }

  return json(years);
}