import { json } from '@sveltejs/kit';
import { getDefaultConnection, Resolution, ResolutionRepository } from '../../../../reader/models';

export async function GET({ url }) {
  const dataSource = await getDefaultConnection();
  const resolutionRepo = ResolutionRepository.createInstance(dataSource);

  const resolution = await resolutionRepo.findOne({where: {resolutionId: url.params.id}});

  return json({ resolution });
}
