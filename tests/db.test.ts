import { DataSource } from 'typeorm'
import { Subject, Resolution, Country, Agenda, Author, ResolutionVote, SlugAlias, SlugAliasRepository, ReadCursor, ResolutionRepository, CountryRepository, AgendaRepository, Vote, ResolutionStatus, ResolutionType, ResolutionVoteRepository, make_slug, AuthorRepository, SubjectRepository, DocumentUrl } from '../src/reader/models'
import { TransformationError, CountryNameTransformer, ResolutionTransformer } from '../src/reader/store'
import { DocumentPage, ResolutionPage } from '../src/reader/crawler'
import { CursorKeeper, TaskResultWrapper, ImportTask, DBCursorKeeper } from '../src/reader/tasks'

export const testDataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [Subject, Resolution, Author, Country, Agenda, ResolutionVote, SlugAlias, ReadCursor, DocumentUrl]
})

class MockCursorKeeper implements CursorKeeper {
    
    updateDate(lastDate: Date): Promise<void> {
        return new Promise<void>(resolve => {
            resolve()
        })
    }

    updatePage(lastPage: number): Promise<void> {
        return new Promise<void>(resolve => {
            resolve()
        })
    }

    get(): Promise<{ lastDate: Date; lastPage: number }> {
        return new Promise<{ lastDate: Date; lastPage: number }>(resolve => {
            resolve({lastDate: new Date(), lastPage: 0})
        })
    }
    
}

function newCountry(name, alpha2: string, fips: number, un_name: string | null=null) {
    const country = new Country()
    country.name = name
    country.alpha2 = alpha2
    country.un_name = un_name ? un_name : name
    country.slug = make_slug(name)
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

function newSlugAlias(slug: string, alias: string) {
    const entity = new SlugAlias()
    entity.slug = slug
    entity.alias = alias
    return entity
}

async function withCountries(...countries: Country[]) {
    const repo = CountryRepository.createInstance(testDataSource)
    for(const country of countries) {
        await repo.insert(country)
    }
}

async function withSlugAliases(...aliases: SlugAlias[]) {
    const repo = SlugAliasRepository.createInstance(testDataSource)
    for(const alias of aliases) {
        await repo.insert(alias)
    }
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

    test('Make Slug', () => {
        expect(make_slug('United States')).toBe('united-states')
        expect(make_slug('Türkiye')).toBe('turkiye')
    })

    test('Slug Aliases', async () => {
        await withCountries(
            newCountry('Turkiye', 'TR', 13)
        )

        await withSlugAliases(
            newSlugAlias('turkiye', 'turkey'),
            newSlugAlias('turkiye', 'trkye')
        )

        let transformer = new CountryNameTransformer(testDataSource)
        expect((await transformer.transform('Türkiye')).alpha2).toBe('TR')
        expect((await transformer.transform('Turkiye')).alpha2).toBe('TR')
        expect((await transformer.transform('Turkey')).alpha2).toBe('TR')
    })

    test('Repo', async () => {
        const repo = new ResolutionRepository(Resolution, testDataSource.createEntityManager())
        const result: boolean = await repo.doesResolutionCodeExist('my-code')
        expect(result).toBe(false)
        const cRepo = new CountryRepository(Country, testDataSource.createEntityManager())
        const cResult = await cRepo.fetchBySlugs(['india'])
        expect(cResult).toBeNull() 
    })

    test('Country Transformer', async () => {
        let transformer = new CountryNameTransformer(testDataSource)
        let entity = await transformer.transform('India')
        expect(entity.name).toBe('India')
        let repo = CountryRepository.createInstance(testDataSource)
        await repo.insert(entity)
        let compare = await repo.fetchBySlugs(['india'])
        expect(compare.un_name).toBe('India')
        let found = await transformer.transform('India')
        expect(found.country_id).toBeGreaterThan(0)
        expect(compare.country_id).toBe(found.country_id)
    })


    test('ResolutionTransformer', async () => {
        await withCountries(newCountry('China', 'CN', 11), newCountry('Cuba', 'CU', 13))
        const decision = new DocumentPage({symbol: 'A/R#1', title: 'Resolution #1', collections: ['Resolutions'], date: new Date('2023-11-10'), detailsUrl: 'details.url', authors: ['China', 'Cuba'], subjects: ['Middle East'], textLinks: {'Arabic': 'arabic.pdf', 'Spanish': 'spanish.pdf'}})
        const votingData = new DocumentPage({title: '', collections: [], date: new Date('2023-11-10'), votes: new Map<string, string>([ ['Brazil', 'Y'], ['Argentina', 'Y'], ['Ghana', 'N'] ])})
        const resolution = new ResolutionPage(votingData, decision)
        expect(Object.entries(resolution.textLinks).length).toBe(2)
        const transformer = new ResolutionTransformer(testDataSource)
        const model = await transformer.transform(resolution)
        expect(model.symbol).toBe('A/R#1')
        expect(model.authors[0].authorName).toBe('China')
        expect(model.authors[1].authorName).toBe('Cuba')
        expect(model.authors[0].country.name).toBe('China')
        expect(model.authors[1].country.name).toBe('Cuba')
        expect(model.documentUrls.length).toBe(2)
        expect(model.documentUrls[0].language).toBe('Arabic')
        expect(model.documentUrls[1].language).toBe('Spanish')
        const repo = new ResolutionRepository(Resolution, testDataSource.createEntityManager())
        const result = await repo.save([model])
        const found = await repo.findOneBy({symbol: 'A/R#1'})
        expect(found.symbol).toBe('A/R#1')
        expect(found.documentUrls.length).toBe(2)
        expect(found.votes.length).toBe(3)
        expect(found.authors.length).toBe(2)
    })

    test('ImporterTask', async () => {
        await withCountries(newCountry('China', 'CN', 11), newCountry('Cuba', 'CU', 13))
        const firstResolution = ResolutionPage.new({
            title: 'Resolution #1',
            symbol: 'A/R/#1',
            date: new Date('2023-0-1'),
            collections: ['Resolutions'],
            subjects: ['Middle East', 'Conflicts'],
            votes: new Map<string, string>([ ['Brazil', 'Y'], ['Argentina', 'Y'], ['Ghana', 'N'] ]),
            voteSummary: 'Accepted with 3 votes',
            authors: ['China', 'Cuba'],
            detailsUrl: 'details1.url',
            textLinks: {'Arabic': 'arabic1.pdf', 'Spanish': 'spanish1.pdf'}             
        })
        const secondResolution = ResolutionPage.new({
            title: 'Resolution #2',
            symbol: 'S/R/#2',
            date: new Date('2021-3-3'),
            collections: ['Resolutions'],
            subjects: ['Environment', 'Climate Change'],
            votes: new Map<string, string>([ ['Germany', 'N'], ['France', 'N'], ['Greece', 'Y'], ['Chile', 'A'] ]),
            voteSummary: 'Accepted with 4 votes',
            authors: ['Group of 77'],
            detailsUrl: 'details2.url',
            textLinks: {'Arabic': 'arabic2.pdf', 'Spanish': 'spanish2.pdf', 'French': 'french2.pdf'}             
        })
        const thirdResolution = ResolutionPage.new({
            title: 'Resolution #3',
            symbol: 'A/R/#3',
            date: new Date('2020-5-5'),
            collections: ['Resolutions'],
            subjects: ['Peace', 'Trade'],
            votes: new Map<string, string>([ ['Thailand', 'A'], ['Vietnam', 'N'], ['Indonesia', 'Y'], ['Phillipines', 'N'], ['Mexico', 'A'] ]),
            voteSummary: 'Accepted with 5 votes',
            authors: ['Group of 77', 'Mexico'],
            detailsUrl: 'details3.url',
            textLinks: {'Arabic': 'arabic3.pdf', 'Spanish': 'spanish3.pdf', 'French': 'french3.pdf'}             
        })

        const cursor = new MockCursorKeeper()
        const task = new ImportTask(testDataSource, cursor)
        const result = await task.importCollection({resolutions: [firstResolution, secondResolution, thirdResolution]})
        expect(result.successes.length).toBe(3)

        const repo = new ResolutionRepository(Resolution, testDataSource.createEntityManager())
        const firstFound = await repo.findOneBy({symbol: 'A/R/#1'})

        expect(firstFound.symbol).toBe('A/R/#1')
        expect(firstFound.votes.length).toBe(3)
        const voteMap = repo.voteMap(firstFound)
        expect(voteMap.size).toBe(3)
        expect(voteMap.get('Brazil')).toBe(Vote.Yes)
        expect(voteMap.get('Argentina')).toBe(Vote.Yes)
        expect(voteMap.get('Ghana')).toBe(Vote.No)
        expect(firstFound.documentUrls[0].language).toBe('Arabic')
        expect(firstFound.documentUrls[1].language).toBe('Spanish')
        expect(firstFound.subjects[0].subjectName).toBe('Middle East')
        expect(firstFound.subjects[1].subjectName).toBe('Conflicts')
        expect(firstFound.authors.length).toBe(2)
        expect(firstFound.authors[0].country.name).toBe('China')

        const secondFound = await repo.findOneBy({symbol: 'S/R/#2'})
        expect(secondFound.symbol).toBe('S/R/#2')

        const thirdFound = await repo.findOneBy({symbol: 'A/R/#3'})
        expect(thirdFound.symbol).toBe('A/R/#3')
    })


})
