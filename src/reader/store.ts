import { Country, Resolution, Agenda, Vote, ResolutionVote, ResolutionType, ResolutionStatus, CountryRepository, AgendaRepository } from "./models"
import { ResolutionDetailsPage } from './crawler'

abstract class Transformer<K, T> {

    item: K

    constructor(item: K) {
        this.item = item
    }

    abstract transform(): T
}


export class CountryNameTransformer extends Transformer<string, Country> {
    
    findCountryByName(name: string): Country | null {
        return CountryRepository.fetchByUnName(this.item)
    }

    transform(): Country {
        let country = this.findCountryByName(this.item)
        if(country == null) {
            country = new Country()
            country.name = this.item
            country.un_name = this.item
        }
        return country
    }
    
}

export class AgendaNameTransformer extends Transformer<string, Agenda> {
    
    findAgendaByName(name: string): Agenda | null {
        return AgendaRepository.fetchByUnName(this.item)
    }

    transform(): Agenda {
        let agenda = this.findAgendaByName(this.item)
        if(agenda == null) {
            agenda = new Agenda()
            agenda.name = this.item
            agenda.un_name = this.item
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

    private __votes() {
        let votes: ResolutionVote[] = []
        this.item.votes.forEach((value, key) => {
            votes.push(new ResolutionVoteTransformer([key, value]).transform())
        })
        return votes
    }

    private __agendas() {
        let agendas: Agenda[] = []
        this.item.agendas.forEach((name) => {
            agendas.push(new AgendaNameTransformer(name).transform())
        })
        return agendas
    }

    transform(): Resolution {
        let resolution = new Resolution()
        resolution.resolutionType = this.item.resolutionCode.charAt(0) == 'A' ? ResolutionType.GeneralCouncil : ResolutionType.SecurityCouncil
        resolution.resolutionStatus = this.item.note.startsWith('RECORDED') ? ResolutionStatus.Recorded : ResolutionStatus.AdoptedWithoutVote
        resolution.draftResolutionCode = this.item.draftResolutionCode
        resolution.meetingRecordCode = this.item.meetingRecordCode
        resolution.note = this.item.note
        resolution.resolutionCode = this.item.resolutionCode
        resolution.title = this.item.title
        resolution.voteDate = this.item.voteDate
        resolution.voteSummary = this.item.voteSummary
        resolution.agendas = this.__agendas()
        resolution.votes = this.__votes()
        return resolution
    }

}

export class ResolutionVoteTransformer extends Transformer<string[], ResolutionVote> {
    
    static readonly LABELS = {'Y': Vote.Yes, 'N': Vote.No, 'A': Vote.Abstained}

    transform(): ResolutionVote {
        let countryName = this.item[0]
        let voteLabel = this.item[1]
        let country = new CountryNameTransformer(countryName).transform()
        let vote = ResolutionVoteTransformer.LABELS[voteLabel] as Vote
        let resolution = new ResolutionVote()
        resolution.country = country
        resolution.vote = vote
        return resolution
    }

}

