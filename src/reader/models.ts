import "reflect-metadata"
import { Entity, PrimaryGeneratedColumn, Column, JoinTable, OneToMany, DataSource, Repository, Unique, ManyToOne, ManyToMany } from "typeorm"

export enum ResolutionType {
    GeneralCouncil = 1,
    SecurityCouncil = 2
}

export enum ResolutionStatus {
    AdoptedWithoutVote = 1,
    Recorded = 2,
    NoMachineGeneratedVote = 3
}

export enum Vote {
    Abstained = 1,
    Yes = 2,
    No = 3,
    Missing = 4
}

@Entity()
export class Country {
    
    @PrimaryGeneratedColumn()
    country_id: number

    @Column({unique: true})
    name: string
    
    @Column({unique: true})
    un_name: string
    
    @Column({unique: true, nullable: true})
    alpha2: string
    
    @Column({unique: true, nullable: true})
    fipscode: number

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

    symbol: string

    title: string

    access: string

    resolutionOrDecision: string

    @ManyToMany(() => Country, {eager: true})
    @JoinTable()
    authors: Country[]

    agendaInformation: string

    date: Date

    description: string

    notes: string

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
    
    @ManyToOne(() => DraftResolution, (draft) => draft.resolutions)
    draftResolution: DraftResolution

    @Column()
    title: string
    
    @Column({unique: true})
    resolutionCode: string

    @Column()
    meetingRecordCode: string
    
    @Column()
    draftResolutionCode: string
    
    @Column()
    note: string
    
    @Column()
    voteSummary: string
    
    @Column()
    voteDate: Date
    
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

export const dataSource = new DataSource({
    type: 'sqlite',
    database: 'storage/votes.db'
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

    async fetchByUnName(name: string): Promise<Country> {
        return await this.findOneBy({un_name: name})
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
