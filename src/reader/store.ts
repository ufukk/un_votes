import { Subject, Country, Resolution, Agenda, Author, Vote, ResolutionVote, ResolutionType, ResolutionStatus, CountryRepository, AgendaRepository, DraftResolution, SubjectRepository, DraftResolutionRepository, make_slug, SlugAlias, SlugAliasRepository, ResolutionRepository, AuthorRepository } from "./models"
import { DraftResolutionPage, ResolutionDetailsPage, YES_VALUE, NO_VALUE, ABSTENTION_VALUE, NONVOTING_VALUE } from './crawler'
import { Auth, DataSource, Repository } from "typeorm"
import { report } from '../utils'

type Transformable = Subject | Country | Resolution | Agenda | ResolutionVote | ResolutionVote | DraftResolution | Author

export class TransformationError extends Error {

    constructor(public readonly obj: Object, message: string) {
        super(message)
    }
}

abstract class Transformer<K, T extends Transformable> {

    protected repository: Repository<T>


    constructor(protected readonly dataSource: DataSource) {
    }

    abstract transform(item: K): Promise<T>

    abstract isNew(item: T): boolean

    async save(item: T): Promise<T> {
        return this.repository.save(item)
    }

    async ensureExists(item: K) {
        let entity = await this.transform(item)
        if(this.isNew(entity)) {
            entity = await this.repository.save(entity)
        }
        return entity
    }

}

export class CountryNameTransformer extends Transformer<string, Country> {
    
    protected repository: CountryRepository

    constructor(protected readonly dataSource: DataSource) {
        super(dataSource)
        this.repository = CountryRepository.createInstance(this.dataSource)
    }

    async findAlias(slug: string): Promise<SlugAlias | null> {
        return SlugAliasRepository.createInstance(this.dataSource).findOneBy({alias: slug})
    }

    async findCountryBySlug(slug: string): Promise<Country | null> {
        const aliasSlug = await this.findAlias(slug)
        const slugs = aliasSlug ? [slug, aliasSlug.slug] : [slug]
        let countryOrNull = await this.repository.fetchBySlugs(slugs)
        return countryOrNull
    }

    async transform(item: string): Promise<Country> {
        let country = await this.findCountryBySlug(make_slug(item))
        if(country == null) {
            country = new Country()
            country.name = item
            country.un_name = item
            country.slug = make_slug(item)
        }
        return country
    }

    isNew(item: Country): boolean {
        return item.country_id == undefined
    }

    async exists(item: Country): Promise<boolean> {
        return (await this.repository.countBy({slug: item.slug})) > 0
    }

}

export class AuthorTransformer extends Transformer<string, Author> {

    protected repository: AuthorRepository
    protected countryRepository: CountryRepository
    protected names: Map<string, number>

    constructor(protected readonly dataSource: DataSource) {
        super(dataSource)
        this.repository = AuthorRepository.createInstance(this.dataSource)
        this.names = new Map<string, number>()
    }

    async transform(item: string): Promise<Author> {
        let author = await this.repository.findOneBy({authorName: item})
        if(author == null) {
            const countryTransformer = new CountryNameTransformer(this.dataSource)
            let country = await countryTransformer.transform(item)
            if(countryTransformer.isNew(country)) {
                country = null
            }
            author = new Author()
            author.authorName = item
            author.country = country
        }
        return author
    }
    
    isNew(item: Author): boolean {
        return item.author_id == undefined
    }

}

export class AgendaNameTransformer extends Transformer<string, Agenda> {
    
    protected repository: AgendaRepository

    constructor(protected readonly dataSource: DataSource) {
        super(dataSource)
        this.repository = AgendaRepository.createInstance(this.dataSource)
    }

    async findAgendaByName(name: string): Promise<Agenda | null> {
        return await AgendaRepository.createInstance(this.dataSource).fetchByUnName(name)
    }

    async transform(item: string): Promise<Agenda> {
        let agenda = await this.findAgendaByName(item)
        if(agenda == null) {
            agenda = new Agenda()
            agenda.name = item
            agenda.un_name = item
        }
        return agenda
    }

    isNew(item: Agenda): boolean {
        return item.agenda_id == undefined
    }

    async exists(item: Agenda): Promise<boolean> {
        return (await this.repository.countBy({un_name: item.un_name})) > 0
    }
}

export class SubjectTransformer extends Transformer<string, Subject> {
    
    protected repository: SubjectRepository
    private names: Map<string, number>

    constructor(protected readonly dataSource: DataSource) {
        super(dataSource)
        this.repository = SubjectRepository.createInstance(this.dataSource)
        this.names = new Map<string, number>()
    }

    async findByName(name: string): Promise<Subject | null> {
        return await this.repository.findOneBy({subjectName: name})
    }

    async transform(item: string): Promise<Subject> {
        let subject = await this.findByName(item)
        if(subject == null) {
            subject = new Subject()
            subject.subjectName = item
        }
        return subject
    }

    isNew(item: Subject): boolean {
        return item.subjectId == undefined
    }

    async exists(item: Subject): Promise<boolean> {
        return (await this.repository.countBy({subjectName: item.subjectName})) > 0
    }

}

export class ResolutionDetailsPageTransformer extends Transformer<ResolutionDetailsPage, Resolution> {
    
    protected repository: ResolutionRepository
    protected agendaTransformer: AgendaNameTransformer
    protected draftRepository: DraftResolutionRepository

    public constructor(dataSource: DataSource) {
        super(dataSource)
        this.repository = ResolutionRepository.createInstance(this.dataSource)
        this.agendaTransformer = new AgendaNameTransformer(this.dataSource)
        this.draftRepository = DraftResolutionRepository.createInstance(this.dataSource)
    }   

    private async __votes(item: ResolutionDetailsPage) {
        let votes: ResolutionVote[] = []
        for(const [key, value] of item.votes.entries()) {
            let tr = new ResolutionVoteTransformer(this.dataSource)
            votes.push(await tr.transform([key, value]))
        }
        return votes
    }

    private async __agendas(item: ResolutionDetailsPage) {
        let agendas: Agenda[] = []
        item.agendas.forEach(async (name) => {
            agendas.push(await this.agendaTransformer.ensureExists(name))
        })
        return agendas
    }

    private findResolutionType(item: ResolutionDetailsPage): ResolutionType {
        if(item.resolutionCode.startsWith('A/')) {
            return ResolutionType.GeneralCouncil
        } else if(item.resolutionCode.startsWith('S/')) {
            return ResolutionType.SecurityCouncil
        }
        throw new TransformationError(item, `Resolution type could not be determined <${item.resolutionCode}>`)
    }

    private findResolutionStatus(item: ResolutionDetailsPage): ResolutionStatus {
        if(item.note && item.note.match(/ADOPTED WITHOUT VOTE/)) {
            return ResolutionStatus.AdoptedWithoutVote
        } else if(item.votes.size > 0) {
            return ResolutionStatus.VotedAndAdopted
        }
        if(item.voteSummary && (item.voteSummary.match(/Adopted/) || item.voteSummary.match(/Voting Summary/))) {
            return ResolutionStatus.VotedAndAdopted
        }
        throw new TransformationError(item, `Resolution status could not be determined <${item.resolutionCode}> | <${item.note}>`)
    }

    async findDraftResolution(item: ResolutionDetailsPage): Promise<DraftResolution | null> {
        if(item.draftResolutionCode) {
            const draft = await this.draftRepository.findOneBy({symbol: item.draftResolutionCode})
            return draft
        }
        return null
    }

    async transform(item: ResolutionDetailsPage): Promise<Resolution> {
        const draft = await this.findDraftResolution(item)
        let resolution = new Resolution()
        resolution.resolutionType = this.findResolutionType(item)
        resolution.resolutionStatus = this.findResolutionStatus(item)
        resolution.draftResolutionCode = item.draftResolutionCode
        resolution.meetingRecordCode = item.meetingRecordCode
        resolution.note = item.note
        resolution.resolutionCode = item.resolutionCode
        resolution.title = item.title
        resolution.voteDate = item.voteDate
        resolution.detailsUrl = item.detailsUrl
        resolution.voteSummary = item.voteSummary
        resolution.agendas = await this.__agendas(item)
        resolution.votes = await this.__votes(item)
        if(draft) {
            resolution.draftResolution = draft
        }
        return resolution
    }

    isNew(item: Resolution): boolean {
        return item.resolutionId == undefined
    }

    async exists(item: Resolution): Promise<boolean> {
        return (await this.repository.countBy({resolutionCode: item.resolutionCode})) > 0
    }

}

export class ResolutionVoteTransformer extends Transformer<[string, string], ResolutionVote> {
    
    async transform(key_value: [string, string]): Promise<ResolutionVote> {
        const labels = new Map<string, Vote>([
            [YES_VALUE, Vote.Yes],
            [NO_VALUE, Vote.No],
            [ABSTENTION_VALUE, Vote.Abstained],
            [NONVOTING_VALUE, Vote.NonVoting]
        ])
        const countryName = key_value[0]
        const voteLabel = key_value[1]
        const country = await new CountryNameTransformer(this.dataSource).ensureExists(countryName)
        const vote = labels.get(voteLabel)
        if(vote == undefined) {
            throw new TransformationError(key_value, `Vote could not be determined: <${countryName}:${voteLabel}>`)
        }
        const resolution = new ResolutionVote()
        resolution.country = country
        resolution.vote = vote
        return resolution
    }
    
    isNew(item: ResolutionVote): boolean {
        return item.vote_id == undefined
    }

    async exists(item: ResolutionVote): Promise<boolean> {
        return (await this.repository.countBy({country: item.country, resolution: item.resolution})) > 0
    }

}

export class DraftResolutionTransformer extends Transformer<DraftResolutionPage, DraftResolution> {
    
    subjectTransformer: SubjectTransformer
    authorTransformer: AuthorTransformer
    protected repository: DraftResolutionRepository

    constructor(protected readonly dataSource: DataSource) {
        super(dataSource)
        this.subjectTransformer = new SubjectTransformer(this.dataSource)
        this.authorTransformer = new AuthorTransformer(this.dataSource)
        this.repository = DraftResolutionRepository.createInstance(this.dataSource)
    }

    private async __subjects(item: DraftResolutionPage): Promise<Subject[]> {
        const results: Subject[] = []
        for(const name of item.subjects) {
            results.push(await this.subjectTransformer.ensureExists(name))
        }
        return results
    }

    private async __authors(item: DraftResolutionPage): Promise<Author[]> {
        const results: Author[] = []
        for(const name of item.authors) {
            results.push(await this.authorTransformer.ensureExists(name))
        }
        return results
    }

    async transform(item: DraftResolutionPage): Promise<DraftResolution> {
        const draft = new DraftResolution()
        draft.access = item.access
        draft.agendaInformation = item.agendaInformation
        draft.date = item.date
        draft.description = item.description
        draft.notes = item.notes
        draft.resolutionOrDecision = item.resolutionOrDecision
        draft.symbol = item.symbol
        draft.title = item.title
        draft.detailsUrl = item.detailsUrl
        draft.subjects = await this.__subjects(item)
        draft.authors = await this.__authors(item)
        return draft
    }

    isNew(item: DraftResolution): boolean {
        return item.draftResolutionId == undefined
    }

    async exists(item: DraftResolution): Promise<boolean> {
        return (await this.repository.countBy({symbol: item.symbol})) > 0
    }
    
}
