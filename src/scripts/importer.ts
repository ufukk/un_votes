import { resolve } from 'path'
import { read_pages, AxiosUrlReader, CachedAxiosUrlReader, ResolutionPage } from '../reader/crawler'
import { defaultDataSource } from "../reader/models"
import { DBCursorKeeper, ImportTask } from '../reader/tasks'
import { report } from '../utils'

async function importFromWeb() {
    console.log('IMPORT ...')
    const conn = await defaultDataSource.initialize()
    const cursor = new DBCursorKeeper(conn)
    const importer = new ImportTask(conn, cursor)
    async function storeData(resolutions: ResolutionPage[], year: number) {
        report(`--SAVING ${resolutions.length}, year: ${year}`)
        //await importer.importCollection({drafts: drafts, resolutions: resolutions})
        //await cursor.updatePage(page)
    }
    await read_pages([2024, 2023, 2022], async (result) => {
        await storeData(result.resolutions, result.year)
    })
}

async function main() {
    const args = process.argv.slice(2);
    if(args[0] == 'import') {
        await importFromWeb()
    }
}

if (require.main.filename === __filename) {
    main()
}
