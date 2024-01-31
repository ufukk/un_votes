import { DataSource } from 'typeorm'
import { Subject, Resolution, Country, Agenda, Author, ResolutionVote, SlugAlias, SlugAliasRepository, ReadCursor, ResolutionRepository, CountryRepository, AgendaRepository, Vote, ResolutionStatus, ResolutionType, ResolutionVoteRepository, DraftResolution, make_slug, DraftResolutionRepository, AuthorRepository, SubjectRepository } from '../src/reader/models'
import { TransformationError, CountryNameTransformer, ResolutionDetailsPageTransformer, DraftResolutionTransformer } from '../src/reader/store'
import { DraftResolutionPage, ResolutionDetailsPage } from '../src/reader/crawler'
import { CursorKeeper, TaskResultWrapper, ImportTask, DBCursorKeeper } from '../src/reader/tasks'

export const testDataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [Subject, DraftResolution, Resolution, Author, Country, Agenda, ResolutionVote, SlugAlias, ReadCursor]
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
        let repo = new ResolutionRepository(Resolution, testDataSource.createEntityManager())
        let result: boolean = await repo.doesResolutionCodeExist('my-code')
        expect(result).toBe(false)
        let cRepo = new CountryRepository(Country, testDataSource.createEntityManager())
        let cResult = await cRepo.fetchBySlugs(['india'])
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

    test('Draft Transformer', async () => {
        await withCountries(
            newCountry('France', 'FR', 13, 'France'),
            newCountry('Ghana', 'GH', 14, 'Ghana'),
            newCountry('Mali', 'ML', 15, 'Mali')
        )

        const repo = CountryRepository.createInstance(testDataSource)
        expect((await repo.findOneBy({un_name: 'France'})).alpha2).toBe('FR')

        const page = new DraftResolutionPage(
            'symbol#1',
            'title#1',
            'open-access',
            'res#1',
            ['France', 'Ghana', 'Mali'],
            'new agenda',
            new Date(2023, 1, 1),
            'desc#1',
            'notes#1',
            'details.url?1',
            ['coll#1', 'coll#2'],
            ['Subject #1', 'Subject #2']
            )
        const transformer = new DraftResolutionTransformer(testDataSource)
        const result = await transformer.transform(page)
        expect(result.symbol).toBe(page.symbol)
        expect(result.title).toBe(page.title)
        expect(result.subjects.length).toBe(2)
        expect(result.subjects[0].subjectName).toBe('Subject #1')
        expect(result.authors.length).toBe(3)
        expect(result.authors[0].country.alpha2).toBe('FR')

        const authorRepo = AuthorRepository.createInstance(testDataSource)
        expect(await authorRepo.count()).toBe(3)

    })

    test('Resolution Transformer', async () => {
        let votes = new Map<string, string>()
        votes.set('United States', 'N')
        votes.set('India', 'Y')
        votes.set('China', 'N')
        
        const wrongPage = new ResolutionDetailsPage(
            'New Resolution',
            ['agenda #1', 'agenda #2'],
            'new-code',
            null,
            'new-meeting',
            'draft-code',
            'draft-link',
            null,
            '',
            'votes',
            new Date(2023, 1, 1),
            'details.url?1',
            votes,
            ['coll']
        )

        expect(async () => { 
            await new ResolutionDetailsPageTransformer(testDataSource).transform(wrongPage)
        }).rejects.toThrow(TransformationError)

        const page = new ResolutionDetailsPage(
            'New Resolution',
            ['agenda #1', 'agenda #2'],
            'A/new-code',
            null,
            'new-meeting',
            'draft-code',
            'draft-link',
            null,
            '',
            'votes',
            new Date(2023, 1, 1),
            'details.url?2',
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
        expect(Array.from(entity.agendas.map((a: Agenda) => a.name)).includes('agenda #1')).toBe(true)
        expect(Array.from(entity.agendas.map((a: Agenda) => a.name)).includes('agenda #2')).toBe(true)
    })

    test('DB relationships', async () => {
        const countryRepo = CountryRepository.createInstance(testDataSource)
        const agendaRepo = AgendaRepository.createInstance(testDataSource)
        const resRepo = ResolutionRepository.createInstance(testDataSource)
        const authorRepo = AuthorRepository.createInstance(testDataSource)

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
        resolution.resolutionStatus = ResolutionStatus.AdoptedWithoutVote
        resolution.draftResolutionCode = 'draft-code#1'
        resolution.meetingRecordCode = 'meeting#1'
        resolution.resolutionType = ResolutionType.GeneralCouncil
        resolution.voteDate = new Date(2023, 1, 1)
        resolution.detailsUrl = 'resolution.url?1'
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
        await withCountries(
            newCountry('France', 'FR', 13, 'France'),
            newCountry('Ghana', 'GH', 14, 'Ghana')
        )
        const draftPage1 = new DraftResolutionPage(
            'symbol#1',
            'title#1',
            'open-access',
            'res#1',
            ['France', 'Ghana', 'Un Task Force'],
            'new agenda',
            new Date(2023, 1, 1),
            'desc#1',
            'notes#1',
            'details.url?1',
            ['coll#1', 'coll#2'],
            ['Subject #1', 'Subject #2']
        )
        const draftPage2 = new DraftResolutionPage(
            'symbol#2',
            'title#1',
            'open-access',
            'res#1',
            ['France', 'Ghana', 'Un Task Force'],
            'new agenda',
            new Date(2023, 1, 1),
            'desc#1',
            'notes#1',
            'details.url?2',
            ['coll#1', 'coll#2'],
            ['Subject #1', 'Subject #3']
        )
        const draftPage3 = new DraftResolutionPage(
            'symbol#3',
            'title#1',
            'open-access',
            'res#1',
            ['France', 'Ghana', 'Un Task Force'],
            'new agenda',
            new Date(2023, 1, 1),
            'desc#1',
            'notes#1',
            'details.url?3',
            ['coll#1', 'coll#2'],
            ['Subject #1', 'Subject #3']
        )
        let votes = new Map<string, string>()
        votes.set('United States', 'N')
        votes.set('India', 'Y')
        votes.set('China', 'N')
        let resolutionPage = new ResolutionDetailsPage(
            'New Resolution',
            ['agenda #1', 'agenda #2'],
            'A/new-code',
            null,
            'new-meeting',
            'symbol#1',
            'draft-link',
            null,
            '',
            'votes',
            new Date(2022, 1, 1),
            'details.url?4',
            votes,
            ['coll']
        )
        const task = new ImportTask(testDataSource, new MockCursorKeeper())
        const result = await task.importCollection({drafts: [draftPage1, draftPage2], resolutions: [resolutionPage]})
        expect(result.successes.length).toBe(3)
        await task.importCollection({drafts: [draftPage3], resolutions: []})

        const countryRepo = CountryRepository.createInstance(testDataSource)
        const count = await countryRepo.count()
        expect(count).toBe(5)

        const draftRepo = DraftResolutionRepository.createInstance(testDataSource)
        const draft = await draftRepo.findOneBy({symbol: 'symbol#1'})
        expect(draft.authors.length).toBe(3)
        expect(draft.subjects.length).toBe(2)

        const authorRepo = AuthorRepository.createInstance(testDataSource)
        const franceAuthor = await authorRepo.findOneBy({authorName: 'France'})
        const unTaskForce = await authorRepo.findOneBy({authorName: 'Un Task Force'})
        const numberOfAuthors = await authorRepo.count()
        expect(unTaskForce.country).toBeNull()
        expect(franceAuthor.country.name).toBe('France')
        expect(numberOfAuthors).toBe(3)

        const subjectRepo = SubjectRepository.createInstance(testDataSource)
        const numberOfSubjects = await subjectRepo.count()
        expect(numberOfSubjects).toBe(3)

        const resRepo = ResolutionRepository.createInstance(testDataSource)
        const res1 = await resRepo.findOneBy({resolutionCode: 'A/new-code'})
        expect(res1.draftResolution.symbol).toBe('symbol#1')
    })

    test('Custom Cursor Keeper', async () => {
        class _MyCursor implements CursorKeeper {
            lastDate: Date = null
            lastPage: number = null
            updateDate(lastDate: Date) {
                return new Promise<void>(resolve => {
                    this.lastDate = lastDate
                    resolve()
                })
            }

            updatePage(lastPage: number): Promise<void> {
                return new Promise<void>(resolve => {
                    if(lastPage < this.lastPage) {
                        this.lastPage = lastPage
                    }
                    resolve()
                })
            }

            get() {
                return new Promise<{lastDate: Date, lastPage: number}>(resolve => {
                    resolve({lastDate: this.lastDate, lastPage: this.lastPage})
                })
            }
        }

        let votes = new Map<string, string>()
        votes.set('United States', 'N')
        votes.set('India', 'Y')
        votes.set('China', 'N')

        const cursor = new _MyCursor()
        const resolutions = [
            new ResolutionDetailsPage(
                'New Resolution',
                [],
                'A/new-code-#1',
                null,
                'new-meeting-#1',
                'draft-code-#',
                'draft-link-#',
                null,
                '',
                'votes',
                new Date(2022, 2, 1),
                'details.url?1',
                votes,
                ['coll']
            ),
            new ResolutionDetailsPage(
                'New Resolution',
                [],
                'A/new-code-#2',
                null,
                'new-meeting-#1',
                'draft-code-#',
                'draft-link-#',
                null,
                '',
                'votes',
                new Date(2021, 1, 1),
                'details.url?2',
                votes,
                ['coll']
            ),
            new ResolutionDetailsPage(
                'New Resolution',
                [],
                'A/new-code-#3',
                null,
                'new-meeting-#1',
                'draft-code-#',
                'draft-link-#',
                null,
                '',
                'votes',
                new Date(2023, 1, 1),
                'details.url?3',
                votes,
                ['coll']
            )
        ]
        const task = new ImportTask(testDataSource, cursor)
        await task.importCollection({drafts: [], resolutions: resolutions})
        expect((await cursor.get()).lastDate).toStrictEqual(new Date(2021, 1, 1))
    })

    test('DB Cursor Keeper', async () => {
        let votes = new Map<string, string>()
        votes.set('United States', 'N')
        votes.set('India', 'Y')
        votes.set('China', 'N')

        const cursor = new DBCursorKeeper(testDataSource)
        const resolutions = [
            new ResolutionDetailsPage(
                'New Resolution',
                [],
                'A/new-code-#1',
                null,
                'new-meeting-#1',
                'draft-code-#',
                'draft-link-#',
                null,
                '',
                'votes',
                new Date(2022, 2, 1),
                'details.url?1',
                votes,
                ['coll']
            ),
            new ResolutionDetailsPage(
                'New Resolution',
                [],
                'A/new-code-#2',
                null,
                'new-meeting-#1',
                'draft-code-#',
                'draft-link-#',
                null,
                '',
                'votes',
                new Date(2021, 1, 1),
                'details.url?2',
                votes,
                ['coll']
            ),
            new ResolutionDetailsPage(
                'New Resolution',
                [],
                'A/new-code-#3',
                null,
                'new-meeting-#1',
                'draft-code-#',
                'draft-link-#',
                null,
                '',
                'votes',
                new Date(2023, 1, 1),
                'details.url?3',
                votes,
                ['coll']
            )
        ]
        await cursor.updatePage(3)
        const task = new ImportTask(testDataSource, cursor)
        await task.importCollection({drafts: [], resolutions: resolutions})
        expect((await cursor.get()).lastDate).toStrictEqual(new Date(2021, 1, 1))
        expect((await cursor.get()).lastPage).toStrictEqual(3)
    })

})
