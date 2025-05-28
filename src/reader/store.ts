import { Subject, Country, Resolution, Agenda, Author, Vote, ResolutionVote, ResolutionType, ResolutionStatus, CountryRepository, AgendaRepository, SubjectRepository, ResolutionRepository, make_slug, SlugAlias, SlugAliasRepository, AuthorRepository, VotingType, DocumentUrl } from "./models"
import { ResolutionPage, YES_VALUE, NO_VALUE, ABSTENTION_VALUE, NONVOTING_VALUE } from './crawler'
import { DataSource, Repository } from "typeorm"
import { report } from '../utils'

type Transformable = Subject | Country | Resolution | Agenda | ResolutionVote | ResolutionVote | Author | DocumentUrl

type DocumentUrlItem = { language: string, url: string }

export class TransformationError extends Error {

    constructor(public readonly obj: Object, message: string) {
        super(message)
    }
}

abstract class Transformer<K, T extends Transformable> {

    protected repository: Repository<T> = null


    constructor(protected readonly dataSource: DataSource) {
    }

    abstract transform(item: K): Promise<T>

    abstract exists(item: T): Promise<boolean>

    async save(item: T): Promise<T> {
        return this.repository.save(item)
    }

    async ensureExists(item: K) {
        let entity = await this.transform(item)
        if(!(await this.exists(entity))) {
            entity = await this.repository.save(entity)
        }
        return entity
    }

}

export class CountryNameTransformer extends Transformer<string, Country> {
    
    protected repository: CountryRepository = null

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

    async exists(item: Country): Promise<boolean> {
        return (await this.repository.countBy({slug: item.slug})) > 0
    }

}

export class DocumentUrlTransformer extends Transformer<DocumentUrlItem, DocumentUrl> {
    
    async transform(item: DocumentUrlItem): Promise<DocumentUrl> {
        const model = new DocumentUrl()
        model.language = item['language']
        model.url = item['url']
        return model
    }

    exists(item: DocumentUrl): Promise<boolean> {
        return new Promise<boolean>(() => { return false })
    }
    
}

export class AuthorTransformer extends Transformer<string, Author> {

    protected repository: AuthorRepository = null
    protected countryRepository: CountryRepository
    protected names: Map<string, number>

    constructor(protected readonly dataSource: DataSource) {
        super(dataSource)
        this.repository = AuthorRepository.createInstance(this.dataSource)
        this.countryRepository = CountryRepository.createInstance(this.dataSource)
        this.names = new Map<string, number>()
    }

    async transform(item: string): Promise<Author> {
        const country = await new CountryNameTransformer(this.dataSource).ensureExists(item)
        const existingAuthor = await this.repository.findOneBy({country: country})
        if(!existingAuthor) {
            const author = new Author()
            author.authorName = item
            author.country = country
            return author
        }
        return existingAuthor
    }
    
    async exists(item: Author): Promise<boolean> {
        return (await this.repository.countBy({authorName: item.authorName})) > 0
    }

}

export class AgendaNameTransformer extends Transformer<string, Agenda> {
    
    protected repository: AgendaRepository = null

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

    async exists(item: Agenda): Promise<boolean> {
        return (await this.repository.countBy({un_name: item.un_name})) > 0
    }
}

export class SubjectTransformer extends Transformer<string, Subject> {
    
    protected repository: SubjectRepository = null
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

    async exists(item: Subject): Promise<boolean> {
        return (await this.repository.countBy({subjectName: item.subjectName})) > 0
    }

}

export class ResolutionTransformer extends Transformer<ResolutionPage, Resolution> {
    
    protected repository: ResolutionRepository = null
    protected agendaTransformer: AgendaNameTransformer
    protected subjectTransformer: SubjectTransformer
    protected authorTransformer: AuthorTransformer
    protected documentUrlTransformer: DocumentUrlTransformer

    public constructor(dataSource: DataSource) {
        super(dataSource)
        this.repository = ResolutionRepository.createInstance(this.dataSource)
        this.agendaTransformer = new AgendaNameTransformer(this.dataSource)
        this.subjectTransformer = new SubjectTransformer(this.dataSource)
        this.authorTransformer = new AuthorTransformer(this.dataSource)
        this.documentUrlTransformer = new DocumentUrlTransformer(this.dataSource)
    }   

    private async __votes(item: ResolutionPage) {
        let votes: ResolutionVote[] = []
        for(const [key, value] of item.votes.entries()) {
            let tr = new ResolutionVoteTransformer(this.dataSource)
            votes.push(await tr.transform([key, value]))
        }
        return votes
    }

    private async __agendas(item: ResolutionPage) {
        let agendas: Agenda[] = []
        item.agendas.forEach(async (name) => {
            agendas.push(await this.agendaTransformer.ensureExists(name))
        })
        return agendas
    }

    private findResolutionType(item: ResolutionPage): VotingType {
        if(item.symbol.startsWith('A/')) {
            return VotingType.GeneralCouncil
        } else if(item.symbol.startsWith('S/')) {
            return VotingType.SecurityCouncil
        }
        throw new TransformationError(item, `Resolution type could not be determined <${item.symbol}>`)
    }

    private findResolutionStatus(item: ResolutionPage): ResolutionStatus {
        if(item.notes && item.notes.match(/ADOPTED WITHOUT VOTE/)) {
            return ResolutionStatus.AdoptedWithoutVote
        } else if(item.votes.size > 0) {
            return ResolutionStatus.VotedAndAdopted
        }
        if(item.voteSummary && (item.voteSummary.match(/Adopted/) || item.voteSummary.match(/Voting Summary/))) {
            return ResolutionStatus.VotedAndAdopted
        }
        if(item.title.match(/adopted by/)) {
            return ResolutionStatus.AdoptedWithoutVote
        }
        return ResolutionStatus.Unknown
    }

    private async __subjects(item: ResolutionPage): Promise<Subject[]> {
        const results: Subject[] = []
        for(const name of item.subjects) {
            results.push(await this.subjectTransformer.ensureExists(name))
        }
        return results
    }

    private async __authors(item: ResolutionPage): Promise<Author[]> {
        const results: Author[] = []
        for(const name of item.authors) {
            results.push(await this.authorTransformer.ensureExists(name))
        }
        return results
    }

    private async __documentUrls(item: ResolutionPage): Promise<DocumentUrl[]> {
        const models: DocumentUrl[] = []
        for(const key in item.textLinks) {
            models.push(await this.documentUrlTransformer.transform({language: key, url: item.textLinks[key]}))
        }
        return models
    }

    async transform(item: ResolutionPage): Promise<Resolution> {
        let resolution = new Resolution()
        resolution.resolutionSymbol = item.symbol
        resolution.votingType = this.findResolutionType(item)
        resolution.resolutionStatus = this.findResolutionStatus(item)
        resolution.notes = item.notes
        resolution.title = item.title
        resolution.date = item.date
        resolution.year = item.date.getFullYear()
        resolution.detailsUrl = item.detailsUrl
        resolution.voteSummary = item.voteSummary
        resolution.agendas = await this.__agendas(item)
        resolution.votes = await this.__votes(item)
        resolution.subjects = await this.__subjects(item)
        resolution.authors = await this.__authors(item)
        resolution.documentUrls = await this.__documentUrls(item)
        return resolution
    }

    async exists(item: Resolution): Promise<boolean> {
        return (await this.repository.countBy({resolutionSymbol: item.resolutionSymbol})) > 0
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
        return item.voteId == undefined
    }

    async exists(item: ResolutionVote): Promise<boolean> {
        return (await this.repository.countBy({country: item.country, resolution: item.resolution})) > 0
    }

}

