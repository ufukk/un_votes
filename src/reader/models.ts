import "reflect-metadata"
import { Entity, PrimaryGeneratedColumn, Column, JoinTable, OneToMany, DataSource, Repository, Unique, ManyToOne, ManyToMany, In, OneToOne, JoinColumn, PrimaryColumn } from "typeorm"

export enum ResolutionType {
    Resolution,
    MeetingRecord,
    Draft
}

export enum VotingType {
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

    @Column({primary: true, length: 50, type: 'varchar'})
    cursorId: string

    @Column({nullable: true, type: 'date'})
    lastDate: Date

    @Column({nullable: true, type: 'integer'})
    year: number
}

@Entity()
@Unique(['slug', 'alias'])
export class SlugAlias {

    @PrimaryGeneratedColumn()
    slugId: number

    @Column({length: 50, type: 'varchar'})
    slug: string

    @Column({length: 50, type: 'varchar'})
    alias: string
}

@Entity()
export class Country {
    
    @PrimaryGeneratedColumn()
    country_id: number

    @Column({unique: true, type: 'varchar'})
    name: string
    
    @Column({unique: true, type: 'varchar'})
    un_name: string
    
    @Column({unique: true, type: 'varchar'})
    slug: string

    @Column({unique: true, nullable: true, type: 'varchar'})
    alpha2: string
    
    @Column({unique: true, nullable: true, type: 'varchar'})
    iso3: string

    @Column({unique: true, nullable: true, type: 'integer'})
    fipscode: number
}

@Entity()
export class Author {

    @PrimaryGeneratedColumn()
    author_id: number

    @Column({unique: true, type: 'varchar'})
    authorName: string

    @OneToOne(() => Country, {eager: true, nullable: true})
    @JoinColumn()
    country: Country | null
}

@Entity()
export class Agenda {

    @PrimaryGeneratedColumn()
    agenda_id: number

    @Column({unique: true, type: 'varchar'})
    name: string

    @Column({unique: true, type: 'varchar'})
    un_name: string
}

@Entity()
export class Subject {

    @PrimaryGeneratedColumn()
    subjectId: number

    @Column({unique: true, type: 'varchar'})
    subjectName: string
}


@Entity()
export class Resolution {

    @PrimaryColumn('varchar')
    symbol: string

    @Column({type: "varchar"})
    title: string

    @Column({enum: VotingType, type: 'varchar'})
    votingType: VotingType

    @Column({enum: ResolutionStatus, type: 'varchar'})
    resolutionStatus: ResolutionStatus

    @Column({nullable: true, type: 'varchar'})
    alternativeTitles: string
    
    @OneToOne(() => Resolution, {nullable: true})
    meetingRecord: Resolution
    
    @OneToOne(() => Resolution, {nullable: true})
    draftResolution: string
    
    @OneToOne(() => Resolution, {nullable: true})
    committeeReport: string
    
    @Column({nullable: true, type: 'varchar'})
    voteSummary: string

    @Column({nullable: true, type: 'varchar'})
    resolutionOrDecision: string
        
    @Column({nullable: true, type: 'varchar'})
    agendaInformation: string
    
    @Column({type: 'date'})
    date: Date

    @Column({type: 'varchar'})
    detailsUrl: string

    @Column({nullable: true, type: 'varchar'})
    description: string

    @Column({nullable: true, type: 'varchar'})
    notes: string
    
    @OneToMany(() => DocumentUrl, (text) => text.resolution, {eager: true, cascade: true})
    @JoinTable()
    documentUrls: DocumentUrl[]

    @ManyToMany(() => Subject, {eager: true})
    @JoinTable()
    subjects: Subject[]

    @ManyToMany(() => Author, {eager: true})
    @JoinTable()
    authors: Author[]

    @OneToMany(() => ResolutionVote, (vote) => vote.resolution, {eager: true, cascade: true})
    votes: ResolutionVote[]

    @ManyToMany(() => Agenda, {eager: true})
    @JoinTable()
    agendas: Agenda[]
}

@Entity()
export class DocumentUrl {

    @PrimaryGeneratedColumn({type: 'integer'})
    documentId: number

    @Column({type: 'varchar'})
    language: string

    @Column({type: 'varchar'})
    url: string

    @ManyToOne(() => Resolution, (resolution) => resolution.documentUrls)
    resolution: Resolution
}


@Entity()
@Unique(['resolution', 'country'])
export class ResolutionVote {

    @PrimaryGeneratedColumn({type: 'integer'})
    vote_id: number

    @ManyToOne(() => Resolution, (resolution) => resolution.votes)
    resolution: Resolution

    @ManyToOne((type) => Country, {eager: true})
    country: Country

    @Column({enum: Vote, type: 'varchar'})
    vote: Vote
}

export const defaultDataSource = new DataSource({
    type: process.env.DB_TYPE as 'sqlite' || 'sqlite',
    database: process.env.DB_URL || 'storage/votes.db',
    entities: [Subject, Resolution, Author, Country, Agenda, ResolutionVote, SlugAlias, ReadCursor, DocumentUrl]
})

let dataConnection: DataSource | null = null

export async function getDefaultConnection(): Promise<DataSource> {
    if(!dataConnection) {
        dataConnection = await defaultDataSource.initialize()
    }
    return dataConnection
}

class BaseRepository<T> extends Repository<T> {

    

}

export class ResolutionRepository extends BaseRepository<Resolution> {
    
    static createInstance(dataSource: DataSource): ResolutionRepository {
        return new ResolutionRepository(Resolution, dataSource.createEntityManager())
    }

    voteMap(resolution: Resolution): Map<string, Vote> {
        let vote_map = new Map<string, Vote>()
        for(let vote of resolution.votes) {
            vote_map.set(vote.country.name, vote.vote)
        }
        return vote_map
    }

    async resolutionsByYear(year: number, limit: number, offset: number): Promise<Resolution[]> {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year + 1, 0, 1);
        return this.createQueryBuilder('resolution')
          .where('date >= :startDate AND date < :endDate', { startDate, endDate })
          .orderBy('date', 'ASC')
          .skip(offset)
          .take(limit)
          .getMany();
    }
      
    async resolutionCountByYear(year: number): Promise<number> {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year + 1, 0, 1);
        return this.createQueryBuilder('resolution')
          .where('date >= :startDate AND date < :endDate', { startDate, endDate })
          .getCount();
    }

    async resolutionsByAgenda(agenda: number, limit: number, offset: number): Promise<Resolution[]> {
        return this.createQueryBuilder('resolution')
          .leftJoinAndSelect('resolution.agendas', 'agenda')
          .where('agenda.agenda_id = :agenda', { agenda })
          .orderBy('date', 'ASC')
          .skip(offset)
          .take(limit)
          .getMany();
    }
    
    async doesResolutionCodeExist(symbol: string): Promise<boolean> {
        return (await this.countBy({symbol: symbol})) > 0
    }

    async latestYear(): Promise<number> {
        return new Date((await this.createQueryBuilder('resolution')
        .select('MAX(date)', 'max_date')
        .getRawOne()).max_date).getFullYear()
    }

    async earliestYear(): Promise<number> {
        return new Date((await this.createQueryBuilder('resolution')
        .select('MIN(date)', 'min_date')
        .getRawOne()).min_date).getFullYear()
    }

    async getYearResolutionNumbers(): Promise<{year: number, total: number}[]> {
        return this.createQueryBuilder('resolution')
          .select('CAST(strftime("%Y", date) as \'integer\')', 'year')
          .addSelect('COUNT(*)', 'total')
          .groupBy('year')
          .orderBy('year', 'ASC')
          .getRawMany();
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

    async fetchBySlugs(slugs: string[]): Promise<Country | null> {
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
