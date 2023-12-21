import { Subject, Country, Resolution, Agenda, Vote, ResolutionVote, ResolutionType, ResolutionStatus, CountryRepository, AgendaRepository, DraftResolution } from "./models"
import { DraftResolutionPage, ResolutionDetailsPage } from './crawler'
import { DataSource } from "typeorm"

abstract class Transformer<K, T> {

    constructor(protected readonly dataSource: DataSource) {
    }

    abstract transform(item: K): Promise<T>
}


export class CountryNameTransformer extends Transformer<string, Country> {
    
    async findCountryByName(name: string): Promise<Country | null> {
        return await CountryRepository.createInstance(this.dataSource).fetchByUnName(name)
    }

    async transform(item: string): Promise<Country> {
        let country = await this.findCountryByName(item)
        if(country == null) {
            country = new Country()
            country.name = item
            country.un_name = item
        }
        return country
    }
    
}

export class AgendaNameTransformer extends Transformer<string, Agenda> {
    
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

}

export class ResolutionDetailsPageTransformer extends Transformer<ResolutionDetailsPage, Resolution> {
    
    static readonly TYPES = {
        'General': ResolutionType.GeneralCouncil,
        'Security': ResolutionType.SecurityCouncil
    }

    static readonly STATUS = {
        'Recorded': ResolutionStatus.Recorded,
        'Adopted without Vote': ResolutionStatus.AdoptedWithoutVote,
        'No Machine Generated Vote': ResolutionStatus.NoMachineGeneratedVote
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
            let agendaTransformer = new AgendaNameTransformer(this.dataSource)
            agendas.push(await agendaTransformer.transform(name))
        })
        return agendas
    }

    async transform(item: ResolutionDetailsPage): Promise<Resolution> {
        let resolution = new Resolution()
        resolution.resolutionType = item.resolutionCode.charAt(0) == 'A' ? ResolutionType.GeneralCouncil : ResolutionType.SecurityCouncil
        resolution.resolutionStatus = item.note.startsWith('RECORDED') ? ResolutionStatus.Recorded : ResolutionStatus.AdoptedWithoutVote
        resolution.draftResolutionCode = item.draftResolutionCode
        resolution.meetingRecordCode = item.meetingRecordCode
        resolution.note = item.note
        resolution.resolutionCode = item.resolutionCode
        resolution.title = item.title
        resolution.voteDate = item.voteDate
        resolution.voteSummary = item.voteSummary
        resolution.agendas = await this.__agendas(item)
        resolution.votes = await this.__votes(item)
        return resolution
    }

}

export class ResolutionVoteTransformer extends Transformer<[string, string], ResolutionVote> {
    
    static readonly LABELS = {'Y': Vote.Yes, 'N': Vote.No, 'A': Vote.Abstained}

    async transform(key_value: [string, string]): Promise<ResolutionVote> {
        let countryName = key_value[0]
        let voteLabel = key_value[1]
        let country = await new CountryNameTransformer(this.dataSource).transform(countryName)
        let vote = ResolutionVoteTransformer.LABELS[voteLabel] as Vote
        let resolution = new ResolutionVote()
        resolution.country = country
        resolution.vote = vote
        return resolution
    }

}

export class SubjectTransformer extends Transformer<string, Subject> {
    
    transform(item: string): Promise<Subject> {
        throw new Error("Method not implemented.")
    }
    
}

export class DraftResolutionTransformer extends Transformer<DraftResolutionPage, DraftResolution> {
    
    transform(item: DraftResolutionPage): Promise<DraftResolution> {
        throw new Error("Method not implemented.")
    }
    
}