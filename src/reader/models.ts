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
    No = 3
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
    alpha2: string
    
    @Column({unique: true})
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

    @ManyToMany(() => Resolution)
    resolutions: Resolution[]
}

@Entity()
@Unique('country_resolution', ['resolutionId', 'country_id'])
export class ResolutionVote {

    @PrimaryGeneratedColumn()
    vote_id: number

    @ManyToOne(() => Resolution)
    resolution: Resolution

    @ManyToOne(() => Country)
    country: Country

    @Column()
    vote: Vote
}

@Entity()
export class Resolution {

    @PrimaryGeneratedColumn()
    resolutionId: number

    @Column()
    resolutionType: ResolutionType
    
    @Column()
    resolutionStatus: ResolutionStatus
    
    @Column()
    title: string
    
    @Column()
    agenda: string
    
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
    
    @OneToMany(() => ResolutionVote, (vote) => vote.resolution)
    votes: ResolutionVote[]

    @ManyToMany(() => Agenda)
    @JoinTable()
    agendas: Array<Agenda>
}


export const dataSource = new DataSource({
    type: 'sqlite',
    database: 'storage/votes.db'
})


export const ResolutionRepository = dataSource.getRepository(Resolution).extend({
    resolutionsByYear(year): Resolution[] {
        let startDate = new Date(year, 1, 1)
        let endDate = new Date(year + 1, 1, 1)
        let query = this.createQueryBuilder('resolution')
        .where('voteDate >= :startDate AND voteDate < :endDate', {startDate, endDate})
        .orderBy('voteDate', 'ASC')
        return query.getMany()
    },

    resolutionsByAgenda(agenda: number): Resolution[] {
        return this.createQueryBuilder('resolution')
        .leftJoinAndSelect('resolution.agendas', 'agenda')
        .where('agenda_id == :agenda_id', { agenda })
        .orderBy('voteDate', 'ASC')
        .getMany()
    },

    doesResolutionCodeExist(code: string): boolean {
        return this.createQueryBuilder('resolution')
        .where('resolutionCode == :code', { code })
        .count('resolutionId') > 0
    }
})


export const ResolutionVoteRepository = dataSource.getRepository(ResolutionVote).extend({
    votesForResolution(resolutionId: number): Map<string, ResolutionVote> {
        let votes: ResolutionVote[] = this.createQueryBuilder('resolution_vote')
        .where('resolution_id = :resolution_id', {resolutionId})
        .getMany()
        let vote_map = new Map<string, ResolutionVote>()
        for(let vote of votes) {
            vote_map[vote.country.name] = vote.vote
        }
        return vote_map
    }
})

export const CountryRepository = dataSource.getRepository(Country).extend({
    fetchByUnName(name: string): Country | null {
        return this.createQueryBuilder('country')
        .where('un_name = :name', {name})
        .getOne()
    }
})

export const AgendaRepository = dataSource.getRepository(Agenda).extend({
    fetchByUnName(name: string): Agenda | null {
        return this.createQueryBuilder('agenda')
        .where('un_name = :name', {name})
        .getOne()
    }
})