import { DataSource } from 'typeorm'
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

    constructor(items: T[], public readonly dataSource: DataSource) {
        this.items = items
        this.taskResult = new TaskResult()
    }

    abstract importAll(items: T[])

}

export class ResolutionImportTask extends ImportTask<Resolution> {
    
    async importNewCountries() {
        let newCountries: Record<string, Country> = {}
        this.items.forEach((resolution) => {
            resolution.votes.forEach((vote) => {
                if(vote.country.country_id == undefined && !(vote.country.un_name in newCountries)) {
                    newCountries[vote.country.un_name] = vote.country
                }
            })
        })
        let repo = CountryRepository.createInstance(this.dataSource)
        for(let name in newCountries) {
            await repo.insert(newCountries[name])
        }
        for (const resolution of this.items)  {
            for (const vote of resolution.votes) {
                vote.country = await repo.findOneBy({un_name: vote.country.un_name})
                vote.resolution = resolution
            }
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
        let repo = AgendaRepository.createInstance(this.dataSource)
        for(let name in newAgendas) {
            await repo.insert(newAgendas[name])
        }
        for (const resolution of this.items)  {
            let names: string[] = []
            for (const agenda of resolution.agendas) {
                names.push(agenda.un_name)
            }
            resolution.agendas = []
            for(const name of names) {
                resolution.agendas.push(await repo.findOneBy({un_name: name}))
            }
        }
    }

    async importAll() {
        await this.importNewCountries()
        await this.importNewAgendas()
        let repo = ResolutionRepository.createInstance(this.dataSource)
        for(let item of this.items) {
            if((await repo.doesResolutionCodeExist(item.resolutionCode))) {
                this.taskResult.skipped++
                continue
            }
            await repo.save(item)
            this.taskResult.successes++
        }
    }

}


