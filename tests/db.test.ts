import { DataSource } from 'typeorm'
import { Subject, Resolution, Country, Agenda, ResolutionVote, ResolutionRepository, CountryRepository, AgendaRepository, Vote, ResolutionStatus, ResolutionType, ResolutionVoteRepository, DraftResolution } from '../src/reader/models'
import { CountryNameTransformer, ResolutionDetailsPageTransformer } from '../src/reader/store'
import { ResolutionDetailsPage } from '../src/reader/crawler'
import { ResolutionImportTask } from '../src/reader/tasks'

export const testDataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [Subject, DraftResolution, Resolution, Country, Agenda, ResolutionVote]
})

function newCountry(name, alpha2: string, fips: number, un_name: string | null=null) {
    const country = new Country()
    country.name = name
    country.alpha2 = alpha2
    country.un_name = un_name ? un_name : name
    country.fipscode = fips
    return country
}

async function newResolutionVote(countryName: string, vote: Vote, res: Resolution) {
    const countryRepo = CountryRepository.createInstance(testDataSource)
    const resVote = new ResolutionVote()
    resVote.country = await countryRepo.findOneBy({un_name: countryName})
    resVote.vote = vote
    resVote.resolution = res
    return resVote
}

function newAgenda(name: string, un_name: string | null=null) {
    const agenda = new Agenda()
    agenda.name = name
    agenda.un_name = un_name ? un_name : name
    return agenda
}

describe('db tests', () => {

    beforeEach(async () => {
        await testDataSource.initialize()
        await testDataSource.synchronize(true)
    })

    afterEach(async () => {
        await testDataSource.destroy()
    })

    test('DB Check', async () => {
        let repo = testDataSource.getRepository(Country)
        let result = await repo.count({where: {
            alpha2: 'IN'
        }})
        expect(result).toBe(0)
    })

    test('Repo', async () => {
        let repo = new ResolutionRepository(Resolution, testDataSource.createEntityManager())
        let result: boolean = await repo.doesResolutionCodeExist('my-code')
        expect(result).toBe(false)
        let cRepo = new CountryRepository(Country, testDataSource.createEntityManager())
        let cResult = await cRepo.fetchByUnName('India')
        expect(cResult).toBeNull() 
    })

    test('Country Transformer', async () => {
        let transformer = new CountryNameTransformer(testDataSource)
        let entity = await transformer.transform('India')
        expect(entity.name).toBe('India')
        let repo = CountryRepository.createInstance(testDataSource)
        await repo.insert(entity)
        let compare = await repo.fetchByUnName('India')
        expect(compare.un_name).toBe('India')
        let found = await transformer.transform('India')
        expect(found.country_id).toBeGreaterThan(0)
        expect(compare.country_id).toBe(found.country_id)
    })

    test('Resolution Transformer', async () => {
        let votes = new Map<string, string>()
        votes.set('United States', 'N')
        votes.set('India', 'Y')
        votes.set('China', 'N')
        
        let page = new ResolutionDetailsPage(
            'New Resolution',
            ['agenda-1', 'agenda-2'],
            'new-code',
            'new-meeting',
            'draft-code',
            null,
            '',
            'votes',
            new Date(2023, 1, 1),
            votes,
            ['coll']
        )

        expect(page.agendas.length).toBe(2)
        expect(page.votes.size).toBe(3)
        const transformer = new ResolutionDetailsPageTransformer(testDataSource)
        let entity = await transformer.transform(page)
        expect(entity.title).toBe(page.title)
        expect(entity.agendas.length).toBe(2)
        expect(entity.votes.length).toBe(3)
        expect(entity.votes[0].country.un_name).toBe('United States')
        expect(entity.agendas[0].un_name).toBe('agenda-1')
    })

    test('DB relationships', async () => {
        const countryRepo = CountryRepository.createInstance(testDataSource)
        const agendaRepo = AgendaRepository.createInstance(testDataSource)
        const resRepo = ResolutionRepository.createInstance(testDataSource)

        await countryRepo.insert(newCountry('United States', 'US', 101))
        await countryRepo.insert(newCountry('India', 'IN', 102))
        await countryRepo.insert(newCountry('China', 'ZH', 103))
        expect(await countryRepo.count()).toBe(3)

        await agendaRepo.insert(newAgenda('agenda#1'))
        await agendaRepo.insert(newAgenda('agenda#2'))
        await agendaRepo.insert(newAgenda('agenda#3'))

        const resolution = new Resolution()
        resolution.title = 'Resolution #test'
        resolution.resolutionCode = 'res-code#test'
        resolution.resolutionStatus = ResolutionStatus.Recorded
        resolution.draftResolutionCode = 'draft-code#1'
        resolution.meetingRecordCode = 'meeting#1'
        resolution.resolutionType = ResolutionType.GeneralCouncil
        resolution.voteDate = new Date(2023, 1, 1)
        resolution.note = '...'
        resolution.voteSummary = '3 votes'
        resolution.agendas = [await agendaRepo.findOneBy({un_name: 'agenda#1'}), await agendaRepo.findOneBy({un_name: 'agenda#2'}), await agendaRepo.findOneBy({un_name: 'agenda#3'})]
        await resRepo.save(resolution)
        expect(resolution.resolutionId).toBeGreaterThan(0)
        expect((await resRepo.findOneBy({resolutionCode: 'res-code#test'})).agendas.length).toBe(3)

        let votes: ResolutionVote[] = []
        votes.push(await newResolutionVote('United States', Vote.Yes, resolution))
        votes.push(await newResolutionVote('India', Vote.No, resolution))
        votes.push(await newResolutionVote('China', Vote.Abstained, resolution))

        resolution.votes = votes
        await resRepo.save(resolution)

        const found = await resRepo.findOneBy({resolutionCode: 'res-code#test'})
        expect(found.title).toBe('Resolution #test')
        expect(found.votes.length).toBe(3)
        expect(found.agendas.length).toBe(3)
    })

    test('Import Task', async () => {
        let page1 = new ResolutionDetailsPage(
            'Resolution #1',
            ['agenda-1', 'agenda-2'],
            'res-code#1',
            'new-meeting',
            'draft-code',
            null,
            '',
            'votes',
            new Date(2023, 1, 1),
            new Map<string, string>([['China', 'Y'], ['Mexico', 'N'], ['Venezuela', 'A']]),
            ['coll']
        )
        let page2 = new ResolutionDetailsPage(
            'Resolution #2',
            ['agenda-3'],
            'res-code#2',
            'new-meeting',
            'draft-code',
            null,
            '',
            'votes',
            new Date(2023, 1, 1),
            new Map<string, string>([['China', 'Y'], ['Mexico', 'N'], ['Venezuela', 'A']]),
            ['coll']
        )
        let page3 = new ResolutionDetailsPage(
            'Resolution #3',
            ['agenda-4'],
            'res-code#3',
            'new-meeting',
            'draft-code',
            null,
            '',
            'votes',
            new Date(2023, 1, 1),
            new Map<string, string>([['Vietnam', 'A'], ['Romania', 'Y'], ['Bulgaria', 'N']]),
            ['coll']
        )
        const transformer = new ResolutionDetailsPageTransformer(testDataSource)
        const task = new ResolutionImportTask([await transformer.transform(page1), await transformer.transform(page2), await transformer.transform(page3)], testDataSource) 
        await task.importAll()
        expect(task.taskResult.skipped).toBe(0)
        expect(task.taskResult.successes).toBe(3)
        let repo = ResolutionRepository.createInstance(testDataSource)
        let count = await repo.count()
        expect(count).toBe(3)

        let res1 = await repo.findOneBy({resolutionCode: 'res-code#1'})
        let aRepo = AgendaRepository.createInstance(testDataSource)
        let aCount = await aRepo.countBy({})
        expect(aCount).toBe(4)
        expect(res1.agendas.length).toBe(2)
    })

})
