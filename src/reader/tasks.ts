import { ResolutionDetailsPage } from './crawler'
import { Country, Resolution, Agenda, CountryRepository, AgendaRepository, ResolutionRepository, dataSource } from './models'

class TaskResult {
    successes: number
    skipped: number
    errors: number

    constructor() {
        this.successes = 0
        this.skipped = 0
        this.errors = 0
    }
}

abstract class ImportTask<T> {

    readonly taskResult: TaskResult
    readonly items: T[]

    constructor(items: T[]) {
        this.items = items
        this.taskResult = new TaskResult()
    }

    abstract importAll(items: T[])

}

class ResolutionImportTask extends ImportTask<Resolution> {
    
    async importNewCountries() {
        let newCountries: Record<string, Country> = {}
        this.items.forEach((resolution) => {
            resolution.votes.forEach((vote) => {
                if(vote.country.country_id == undefined && !(vote.country.un_name in newCountries)) {
                    newCountries[vote.country.un_name] = vote.country
                }
            })
        })
        for(let name in newCountries) {
            await CountryRepository.insert(newCountries[name])
        }
    }

    async importNewAgendas() {
        let newAgendas: Record<string, Agenda> = {}
        this.items.forEach((resolution) => {
            resolution.agendas.forEach((agenda) => {
                if(agenda.agenda_id == undefined && !(agenda.un_name in newAgendas)) {
                    newAgendas[agenda.un_name] = agenda
                }
            })
        })
        for(let name in newAgendas) {
            await AgendaRepository.insert(newAgendas[name])
        }
    }

    async importAll() {
        await this.importNewCountries()
        await this.importNewAgendas()
        for(let item of this.items) {
            if(ResolutionRepository.doesResolutionCodeExist(item.resolutionCode)) {
                this.taskResult.skipped++
                continue
            }
            await ResolutionRepository.insert(item)
            this.taskResult.successes++
        }
    }

}


