import { json } from '@sveltejs/kit';
import { getDefaultConnection, Resolution, ResolutionRepository } from '../../../reader/models'; // Adjust the import path as needed

export async function GET({ url }) {
  const year = url.searchParams.get('year');
  const agenda = url.searchParams.get('agenda');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  const dataSource = await getDefaultConnection();
  const resolutionRepo = ResolutionRepository.createInstance(dataSource);

  let resolutions: Resolution[] | null;
  let totalResolutions = 0;

  if (year) {
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year) + 1, 0, 1);
    console.log(startDate)
    resolutions = await resolutionRepo.resolutionsByYear(parseInt(year), limit, (page - 1) * limit);
    totalResolutions = await resolutionRepo.createQueryBuilder('resolution').where('date >= :startDate AND date < :endDate', { startDate, endDate }).getCount()
  } else if (agenda) {
    resolutions = await resolutionRepo.resolutionsByAgenda(parseInt(agenda), limit, (page - 1) * limit);
    totalResolutions = await resolutionRepo.createQueryBuilder('resolution').leftJoinAndSelect('resolution.agendas', 'agenda').where('agenda.agenda_id = :agenda', { agenda }).getCount();
  } else {
    resolutions = await resolutionRepo.find({ take: limit, skip: (page - 1) * limit });
    totalResolutions = await resolutionRepo.count();
  }

  const totalPages = Math.ceil(totalResolutions / limit);

  return json({ resolutions, totalPages });
}