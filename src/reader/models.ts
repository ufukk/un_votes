import "reflect-metadata"
import { Entity, PrimaryGeneratedColumn, Column, JoinTable, OneToMany, DataSource, Repository, Unique, ManyToOne, ManyToMany, In, OneToOne, JoinColumn } from "typeorm"

export enum ResolutionType {
    GeneralCouncil = 1,
    SecurityCouncil = 2
}

export enum ResolutionStatus {
    AdoptedWithoutVote = 1,
    VotedAndAdopted = 2,
    VotedAndRejected = 3
}

export enum Vote {
    Abstained = 1,
    Yes = 2,
    No = 3,
    NonVoting = 4
}

@Entity()
export class ReadCursor {

    @Column({primary: true, length: 50})
    cursorId: string

    @Column({nullable: true})
    lastDate: Date

    @Column({nullable: true})
    lastPage: number
}

@Entity()
@Unique(['slug', 'alias'])
export class SlugAlias {

    @PrimaryGeneratedColumn()
    slugId: number

    @Column({length: 50})
    slug: string

    @Column({length: 50})
    alias: string
}

@Entity()
export class Country {
    
    @PrimaryGeneratedColumn()
    country_id: number

    @Column({unique: true})
    name: string
    
    @Column({unique: true})
    un_name: string
    
    @Column({unique: true})
    slug: string

    @Column({unique: true, nullable: true})
    alpha2: string
    
    @Column({unique: true, nullable: true})
    fipscode: number
}

@Entity()
export class Author {

    @PrimaryGeneratedColumn()
    author_id: number

    @Column({unique: true})
    authorName: string

    @OneToOne(() => Country, {eager: true, nullable: true})
    @JoinColumn()
    country: Country | null
}

@Entity()
export class Agenda {

    @PrimaryGeneratedColumn()
    agenda_id: number

    @Column({unique: true})
    name: string

    @Column({unique: true})
    un_name: string
}

@Entity()
export class Subject {

    @PrimaryGeneratedColumn()
    subjectId: number

    @Column({unique: true})
    subjectName: string
}

@Entity()
export class DraftResolution {
    
    @PrimaryGeneratedColumn()
    draftResolutionId: number

    @Column({unique: true})
    symbol: string

    @Column({})
    title: string

    @Column({nullable: true})
    access: string

    @Column({nullable: true})
    resolutionOrDecision: string

    @ManyToMany(() => Author, {eager: true})
    @JoinTable()
    authors: Author[]

    @Column({nullable: true})
    agendaInformation: string

    @Column({})
    date: Date

    @Column({nullable: true})
    description: string

    @Column({nullable: true})
    notes: string

    @Column({unique: true})
    detailsUrl: string

    @ManyToMany(() => Subject, {eager: true})
    @JoinTable()
    subjects: Subject[]

    @OneToMany(() => Resolution, (res) => res.draftResolution)
    resolutions: Resolution[]
}


@Entity()
export class Resolution {

    @PrimaryGeneratedColumn()
    resolutionId: number

    @Column()
    resolutionType: ResolutionType
    
    @Column()
    resolutionStatus: ResolutionStatus
    
    @ManyToOne(() => DraftResolution, (draft) => draft.resolutions, {eager: true})
    draftResolution: DraftResolution

    @Column()
    title: string
    
    @Column({unique: true})
    resolutionCode: string

    @Column({nullable: true})
    meetingRecordCode: string
    
    @Column({nullable: true})
    draftResolutionCode: string
    
    @Column({nullable: true})
    note: string
    
    @Column({nullable: true})
    voteSummary: string
    
    @Column()
    voteDate: Date
    
    @Column({unique: true})
    detailsUrl: string

    @OneToMany(() => ResolutionVote, (vote) => vote.resolution, {eager: true, cascade: true})
    votes: ResolutionVote[]

    @ManyToMany(() => Agenda, {eager: true})
    @JoinTable()
    agendas: Agenda[]
}


@Entity()
@Unique(['resolution', 'country'])
export class ResolutionVote {

    @PrimaryGeneratedColumn()
    vote_id: number

    @ManyToOne(() => Resolution, (resolution) => resolution.votes)
    resolution: Resolution

    @ManyToOne((type) => Country)
    country: Country

    @Column()
    vote: Vote
}

export const defaultDataSource = new DataSource({
    type: 'sqlite',
    database: 'storage/votes.db',
    entities: [Subject, DraftResolution, Resolution, Author, Country, Agenda, ResolutionVote, SlugAlias, ReadCursor]
})

class BaseRepository<T> extends Repository<T> {

    

}

export class ResolutionRepository extends BaseRepository<Resolution> {
    
    static createInstance(dataSource: DataSource): ResolutionRepository {
        return new ResolutionRepository(Resolution, dataSource.createEntityManager())
    }

    async votesForResolution(resolutionId: number): Promise<Map<string, ResolutionVote>> {
        let votes: ResolutionVote[] = (await this.findOneBy({resolutionId: resolutionId})).votes
        let vote_map = new Map<string, ResolutionVote>()
        for(let vote of votes) {
            vote_map[vote.country.name] = vote.vote
        }
        return vote_map
    }

    async resolutionsByYear(year): Promise<Resolution[]> {
        let startDate = new Date(year, 1, 1)
        let endDate = new Date(year + 1, 1, 1)
        let query = this.createQueryBuilder('resolution')
        .where('voteDate >= :startDate AND voteDate < :endDate', {startDate, endDate})
        .orderBy('voteDate', 'ASC')
        return query.getMany()
    }

    async resolutionsByAgenda(agenda: number): Promise<Resolution[]> {
        return this.createQueryBuilder('resolution')
        .leftJoinAndSelect('resolution.agendas', 'agenda')
        .where('agenda_id == :agenda_id', { agenda })
        .orderBy('voteDate', 'ASC')
        .getMany()
    }

    async doesResolutionCodeExist(code: string): Promise<boolean> {
        return (await this.countBy({resolutionCode: code})) > 0
    }
}

export class ResolutionVoteRepository extends BaseRepository<ResolutionVote> {

    static createInstance(dataSource: DataSource): ResolutionVoteRepository {
        return new ResolutionVoteRepository(ResolutionVote, dataSource.createEntityManager())
    }

}

export class CountryRepository extends BaseRepository<Country> {

    static createInstance(dataSource: DataSource): CountryRepository {
        return new CountryRepository(Country, dataSource.createEntityManager())
    }

    async fetchBySlugs(slugs: string[]): Promise<Country> {
        return await this.findOne({
            where: {slug: In(slugs)}
        })
    }

}

export class AuthorRepository extends BaseRepository<Author> {

    static createInstance(dataSource: DataSource): AuthorRepository {
        return new AuthorRepository(Author, dataSource.createEntityManager())
    }

}

export class AgendaRepository extends BaseRepository<Agenda> {

    static createInstance(dataSource: DataSource): AgendaRepository {
        return new AgendaRepository(Agenda, dataSource.createEntityManager())
    }

    async fetchByUnName(name: string): Promise<Agenda> {
        return await this.findOneBy({un_name: name})
    }

}

export class SubjectRepository extends BaseRepository<Subject> {

    static createInstance(dataSource: DataSource): SubjectRepository {
        return new SubjectRepository(Subject, dataSource.createEntityManager())
    }

    async fetchByName(name: string): Promise<Subject> {
        return await this.findOneBy({subjectName: name})
    }

}

export class DraftResolutionRepository extends BaseRepository<DraftResolution> {
    static createInstance(dataSource: DataSource): DraftResolutionRepository {
        return new DraftResolutionRepository(DraftResolution, dataSource.createEntityManager())
    }
}

export class SlugAliasRepository extends BaseRepository<SlugAlias> {
    static createInstance(dataSource: DataSource): SlugAliasRepository {
        return new SlugAliasRepository(SlugAlias, dataSource.createEntityManager())
    }
}

export class ReadCursorRepository extends BaseRepository<ReadCursor> {
   static createInstance(dataSource: DataSource): ReadCursorRepository {
        return new ReadCursorRepository(ReadCursor, dataSource.createEntityManager())
    }
}

export function make_slug(str: string): string {
    return str.trim().normalize('NFKD').toLowerCase().replace(' ','-').replace(/[^\w\-]/g, '')
}
