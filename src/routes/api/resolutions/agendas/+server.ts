
import { json } from '@sveltejs/kit';
import { getDefaultConnection, AgendaRepository } from '../../../../reader/models'; // Adjust the import path as needed

export async function GET() {
  const dataSource = await getDefaultConnection();
  const agendaRepo = AgendaRepository.createInstance(dataSource);

  const agendas = await agendaRepo.find();
  return json(agendas);
}
