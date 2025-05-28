import "reflect-metadata"
import { resolve } from 'path'
import { readResolutionsByYears, AxiosUrlReader, CachedAxiosUrlReader, ResolutionPage, GatewayReader, DocumentReference, VotingDataReader } from '../reader/crawler'
import { defaultDataSource, ResolutionRepository } from "../reader/models"
import { DBCursorKeeper, ImportTask, CountryImportTask } from '../reader/tasks'
import { report } from '../utils'

async function importFromWeb(years: number[] | null = null) {
    console.log('IMPORT ...')
    const conn = await defaultDataSource.initialize()
    const cursor = new DBCursorKeeper(conn)
    const importer = new ImportTask(conn, cursor)
    async function storeData(resolutions: ResolutionPage[], year: number) {
        report(`--SAVING ${resolutions.length}, year: ${year}`)
        await importer.importCollection({ resolutions: resolutions })
    }
    if (!years) {
        const gatewayPage = await new GatewayReader(new AxiosUrlReader()).fetch();
        const allYears = gatewayPage.years
        const thisYear = new Date().getFullYear()
        const resolutionRepository = ResolutionRepository.createInstance(conn)
        const yearNumbers = (await resolutionRepository.getYearResolutionNumbers()).map((year) => year.year)
        years = allYears.filter((year) => year == thisYear || !yearNumbers.includes(year))
    }
    report(years)
    await readResolutionsByYears(years, async (result) => {
        await storeData(result.resolutions, result.year)
    })
}


async function importCountriesCSV() {
    const conn = await defaultDataSource.initialize()
    await new CountryImportTask(conn).importCountries('storage/countryInfo.txt')
}

async function testResolution(url: string) {
    const doc = await new VotingDataReader(new DocumentReference('', new Date(), '', '', url), new CachedAxiosUrlReader()).fetch()
    console.log(doc.date)
    console.log(doc.meetingRecordCode)
    console.log(doc.draftResolutionCode)
}

async function main() {
    const args = process.argv.slice(2);
    if (args[0] == 'import') {
        const years = args.length > 1 ? args[1].split(',').map((year) => parseInt(year.trim())) : null
        await importFromWeb(years)
    }
    if (args[0] == 'countries') {
        await importCountriesCSV()
    }
    if (args[0] == 'test') {
        await testResolution(args[1].trim())
    }
}

main()
