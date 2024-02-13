import { HtmlParser, GatewayReader, DocumentListPageReader, ResolutionReader, DocumentReference, UrlReader, VotingDataReader, CommitteeReportReader, DraftReader, MeetingRecordReader, DocumentPage, ResolutionPage } from '../src/reader/crawler'
import * as fs from 'fs'

class _FsReader implements UrlReader {
    
    private _data

    async readUrl(url: string): Promise<boolean> {
        let path = null
        if(url.startsWith('https://')) {
            path = 'tests/files/un-voting-list.html'
        } else {
            path = `tests/files/${url}`
        }
        this._data = fs.readFileSync(path, 'utf-8')
        return new Promise<boolean>((resolve) => {resolve(true)})
    }
    isSuccess(): boolean {
        return true
    }
    data() {
        return this._data
    }
    responseData() {
        return {}
    }
}


describe('unvotes tests', () => {
    test('html finder#text', () => {
        let finder = new HtmlParser(`<body>
        <div class="container">
        <span>Span Text</span></div>
        </body>`)
        expect(finder.text('div.container>span')).toBe('Span Text')
        expect(finder.find('span', finder.find('div.container')).textContent).toBe('Span Text')
    })
    
    test('html finder#attr', () => {
        let finder = new HtmlParser(`<body>
        <div class="container">
        <span id="my-id">Span Text</span></div>
        </body>`)
        expect(finder.attribute('div.container>span', 'id')).toBe('my-id')
        expect(finder.find('span', finder.find('div.container')).attributes['id'].value).toBe('my-id')
    })

    test('testFsReader', async () => {
        let reader = new _FsReader()
        reader.readUrl('https://list#1')
        let parser = new HtmlParser(reader.data())
        expect(Number.parseInt(parser.text('td.searchresultsboxheader>span>strong').replace(',', ''))).toBe(22819)
        
    })
    
    test('Read years', async () => {
        const reader = new _FsReader()
        const pageReader = new GatewayReader(reader)
        const page = await pageReader.fetch()
        expect(page.years[0]).toBe(2024)
        expect(page.years.length).toBe(79)
        expect(page.years[78]).toBe(1946)
    })

    test('DocumentListPageReader', async () => {
        const reader = new _FsReader()
        const pageReader = new DocumentListPageReader(1, 2020, reader)
        const page = await pageReader.fetch()
        expect(page.numberOfRecords).toBe(22819)
        expect(page.resolutions.length).toBe(50)
        expect(page.resolutions[0].url).toBe('https://digitallibrary.un.org/record/4036145?ln=en')
        expect(page.resolutions[0].date).toBeInstanceOf(Date)
    })


    test('VotingDataReader', async () => {
        const reader = new _FsReader()
        const pageReader = new VotingDataReader(new DocumentReference(null, null, 'voting', 'un-voting-voting-data.html'), reader) 
        const page = await pageReader.fetch()
        expect(page.title).toBe('Eradicating rural poverty to implement the 2030 Agenda for Sustainable Development : resolution / adopted by the General Assembly')
        expect(page.resolutionCode.code).toBe('A/RES/78/165')
        expect(page.resolutionCode.url).toBe('https://digitallibrary.un.org/record/4031995?ln=en')
        expect(page.agendas).toStrictEqual(['A/78/251 21b Eradicating rural poverty to implement the 2030 Agenda for Sustainable Development. RURAL POVERTY'])
        expect(page.meetingRecordCode.code).toBe('A/78/PV.49')
        expect(page.meetingRecordCode.url).toBeNull()
        expect(page.draftResolutionCode.code).toBe('A/C.2/78/L.30/Rev.1')
        expect(page.draftResolutionCode.url).toBe('https://digitallibrary.un.org/record/4027711?ln=en')
        expect(page.committeeReportCode.code).toBe('A/78/464/Add.2')
        expect(page.committeeReportCode.url).toBe('https://digitallibrary.un.org/record/4029873?ln=en')
        expect(page.notes).toBe('RECORDED - No machine generated vote')
        expect(page.voteSummary).toBe('Voting Summary Yes: 125 | No: 50 | Abstentions: 1 | Non-Voting: 17 | Total voting membership: 193')
        expect(page.date).toStrictEqual(new Date('2023-12-19'))
        expect(Array.from(Object.entries(page.votes)).length).toBe(193)
        expect(page.votes['SERBIA']).toBe('-')
        expect(page.votes['SOMALIA']).toBe('Y')
        expect(page.votes['PORTUGAL']).toBe('N')
        expect(page.collections[1]).toBe('Voting Data')
    })
    
    test('ResolutionReader', async () => {
        const reader = new _FsReader()
        const pageReader = new ResolutionReader(new DocumentReference(null, null, 'resolution#1', 'un-voting-resolution.html'), reader) 
        const page = await pageReader.fetch()
        expect(Object.entries(page.textLinks).length).toBe(6)
        expect(page.textLinks['English']).toBe('https://digitallibrary.un.org/record/4031995/files/A_RES_78_165-EN.pdf')
        expect(page.date).toStrictEqual(new Date('2023-12-19'))
        expect(page.symbol).toBe('A/RES/78/165')
        expect(page.voteSummary).toBe('Adopted 125-50-1, 49th plenary meeting')
        expect(page.notes).toBe('Issued in GAOR, 78th sess., Suppl. no. 49.')
        expect(page.collections).toStrictEqual(['Resolutions and Decisions', 'General Assembly Plenary'])
        expect(page.subjects).toStrictEqual(['2030 Agenda for Sustainable Development', 'POVERTY MITIGATION', 'RURAL POVERTY', 'RURAL DEVELOPMENT', 'SUSTAINABLE DEVELOPMENT'])
    })


    test('CommitteeReportReader', async () => {
        const reader = new _FsReader()
        const pageReader = new CommitteeReportReader(new DocumentReference(null, null, 'resolution#1', 'un-voting-committee-report.html'), reader) 
        const page = await pageReader.fetch()
        expect(page.date.getFullYear()).toBe(2023)
        expect(page.date.getMonth()).toBe(10)
        expect(page.date.getDate()).toBe(17)
        expect(page.symbol).toBe('A/78/433')
        expect(page.authors.length).toBe(1)
        expect(page.authors).toStrictEqual(['UN. General Assembly. 6th Committee'])
        expect(page.agendas).toStrictEqual(['A/78/251 77 Report of the United Nations Commission on International Trade Law on the work of its 56th session. INTERNATIONAL TRADE LAW'])
        expect(page.collections).toStrictEqual(['Draft Resolutions and Decisions', 'General Assembly Plenary', 'Reports', '6th Committee'])
        expect(page.subjects.length).toBe(8)
    })

    test('DraftReader', async () => {
        const reader = new _FsReader()
        const pageReader = new DraftReader(new DocumentReference(null, null, 'resolution#1', 'un-voting-draft.html'), reader) 
        const page = await pageReader.fetch()
        expect(page.date.getFullYear()).toBe(2023)
        expect(page.date.getMonth()).toBe(10)
        expect(page.date.getDate()).toBe(14)
        expect(page.symbol).toBe('A/C.2/78/L.30/Rev.1')
        expect(page.resolutionCode.code).toBe('A/RES/78/165')
        expect(page.resolutionCode.url).toBe('https://digitallibrary.un.org/record/4031995?ln=en')
        expect(page.authors.length).toBe(3)
        expect(Object.entries(page.textLinks).length).toBe(6)
    })


    test('MeetingRecordReader', async () => {
        const reader = new _FsReader()
        const pageReader = new MeetingRecordReader(new DocumentReference(null, null, 'resolution#1', 'un-voting-meeting-record.html'), reader) 
        const page = await pageReader.fetch()
        expect(page.date.getFullYear()).toBe(2024)
        expect(page.date.getMonth()).toBe(0)
        expect(page.date.getDate()).toBe(10)
        expect(page.symbol).toBe('S/PV.9527')
        expect(page.agendas.length).toBe(2)
        expect(Object.entries(page.textLinks).length).toBe(6)
        expect(page.subjects.length).toBe(13)
    })

    test('ResoulutionPage', () => {
        const votingData = new DocumentPage({title: 'Voting Data', date: new Date('2023-0-1'), collections: [], votes: new Map<string, string>([ ['Brazil', 'Y'], ['Argentina', 'Y'], ['Nigeria', 'N']])})
        const decision = new DocumentPage({title: 'Resolution A#13', symbol: 'R#13', date: new Date('2021-2-2'), detailsUrl: 'details.url', collections: ['Resolutions'], subjects: ['Middle East', 'Conflicts'], textLinks: {'Arabic': 'arabic.pdf', 'Spanish': 'spanish.pdf'}})
        const resolution = new ResolutionPage(votingData, decision)
        expect(resolution.symbol).toBe('R#13')
        expect(resolution.collections).toStrictEqual(['Resolutions'])
        expect(resolution.votes.size).toBe(3)
        expect(resolution.votes.get('Brazil')).toBe('Y')
        expect(resolution.subjects).toStrictEqual(['Middle East', 'Conflicts'])
        expect(resolution.textLinks).toStrictEqual({"Arabic": "arabic.pdf", "Spanish": "spanish.pdf"})
        expect(resolution.detailsUrl).toBe('details.url')
    })


})
