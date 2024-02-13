import { DataSource } from 'typeorm'
import { Country, Resolution, Agenda, CountryRepository, AgendaRepository, ResolutionRepository, ReadCursorRepository, Subject, ReadCursor } from './models'
import { ResolutionTransformer } from './store'
import { ResolutionPage } from './crawler'
import { report } from '../utils'

export interface CursorKeeper {

    updateDate(lastDate: Date): Promise<void>

    updatePage(lastPage: number): Promise<void>

    get(): Promise<{lastDate: Date, lastPage: number}>

}

type TaskItem = {type: 'draft' | 'resolution', id: string | number}

interface TaskResult {
    get successes(): TaskItem[]
    get skipped(): TaskItem[]
    get errors(): TaskItem[] 
    fold(batch: TaskResult): void
}

export class DBCursorKeeper implements CursorKeeper {

    cursorRepo: ReadCursorRepository
    readonly cursorId = '_CURSOR'

    constructor(public readonly dataSource: DataSource) {
        this.cursorRepo = ReadCursorRepository.createInstance(this.dataSource)
    }

    private async _getCursor(): Promise<ReadCursor> {
        let cursor = await this.cursorRepo.findOneBy({cursorId: this.cursorId})
        if(cursor == null) {
            cursor = new ReadCursor()
            cursor.cursorId = this.cursorId
        }
        return cursor
    }

    async updateDate(lastDate: Date): Promise<void> {
        const cursor = await this._getCursor()
        if(lastDate < cursor.lastDate || !cursor.lastDate) {
            cursor.lastDate = lastDate
            await this.cursorRepo.save(cursor)
        }
    }

    async updatePage(lastPage: number): Promise<void> {
        const cursor = await this._getCursor()
        if(lastPage > cursor.lastPage || !cursor.lastPage) {
            cursor.lastPage = lastPage
            await this.cursorRepo.save(cursor)
        }
    }

    async get(): Promise<{ lastDate: Date; lastPage: number }> {
        const cursor = await this._getCursor()
        return {lastDate: cursor.lastDate, lastPage: cursor.lastPage}
    }
    
}

class BatchTaskResult implements TaskResult {

    protected readonly _successes: TaskItem[]
    protected readonly _skipped: TaskItem[]
    protected readonly _errors: TaskItem[]

    constructor() {
        this._successes = []
        this._skipped = []
        this._errors = []
    }

    get successes(): TaskItem[] {
        return this._successes
    }

    get skipped(): TaskItem[] {
        return this._skipped
    }

    get errors(): TaskItem[] {
        return this._errors
    } 

    public fold(batch: TaskResult): void {
        this._successes.push(... batch.successes)
        this._skipped.push(... batch.skipped)
        this._errors.push(... batch.errors)
    }

}

export class TaskResultWrapper extends BatchTaskResult {
    constructor() {
        super()
    }
}

type ImportableCollection = {resolutions: ResolutionPage[]}

export class ImportTask {

    readonly taskResult: TaskResultWrapper
    readonly resolutionTransformer: ResolutionTransformer

    constructor(public readonly dataSource: DataSource, 
                public readonly cursorKeeper: CursorKeeper) {
        this.taskResult = new TaskResultWrapper()
        this.resolutionTransformer = new ResolutionTransformer(this.dataSource)
    }

    protected async _importResolutions(items: ResolutionPage[]): Promise<TaskResult> {
        const taskResult = new BatchTaskResult()
        let earliest: Date = null
        for(const resolution of items) {
            const entity = await this.resolutionTransformer.transform(resolution)
            if((await this.resolutionTransformer.exists(entity))) {
                taskResult.skipped.push({type: 'resolution', id: entity.symbol})
                continue
            }
            const saved = await this.resolutionTransformer.save(entity)
            if(entity.date < earliest || earliest == null) {
                earliest = entity.date
            }
            taskResult.successes.push({type: 'resolution', id: saved.symbol})
        }
        await this.cursorKeeper.updateDate(earliest)
        return taskResult
    }

    async importCollection(collection: ImportableCollection): Promise<TaskResult> {
        const taskResult = new BatchTaskResult()
        taskResult.fold(await this._importResolutions(collection.resolutions))
        this.taskResult.fold(taskResult)
        return taskResult
    }
}

