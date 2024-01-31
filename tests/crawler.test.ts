import { HtmlParser, GatewayReader, DraftResolutionPageReader, ResolutionListPageReader, ResolutionDetailsPageReader, ResolutionReference, UrlReader } from '../src/reader/crawler'
import * as fs from 'fs'

class _FsReader implements UrlReader {
    
    private _data

    async readUrl(url: string): Promise<boolean> {
        let path = null
        switch(url) {
            case 'details#1':
                path = 'tests/files/un-voting-details.html'
                break
            case 'draft#1':
                path = 'tests/files/un-voting-draft.html'
                break
            default:
                path = 'tests/files/un-voting-list.html'
                break
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
        reader.readUrl('list#1')
        let parser = new HtmlParser(reader.data())
        expect(Number.parseInt(parser.text('td.searchresultsboxheader>span>strong').replace(',', ''))).toBe(22672)
        
    })
    
    test('Read years', async () => {
        const reader = new _FsReader()
        const pageReader = new GatewayReader(reader)
        const page = await pageReader.fetch()
        expect(page.years[0]).toBe(2023)
        expect(page.years.length).toBe(78)
        expect(page.years[77]).toBe(1946)
    })

    test('ResolutionListPageReader', async () => {
        let reader = new _FsReader()
        let pageReader = new ResolutionListPageReader(1, 2020, reader)
        let page = await pageReader.fetch()
        expect(page.numberOfRecords).toBe(22672)
        expect(page.resolutions.length).toBe(50)
        expect(page.resolutions[0].url).toBe('https://digitallibrary.un.org/record/4029892?ln=en')
        expect(page.resolutions[0].date).toBeInstanceOf(Date)
    })

    test('ResolutionDetailsPageReader', async () => {
        let reader = new _FsReader()
        let ref = new ResolutionReference('', new Date(), '', 'details#1')
        let pageReader = new ResolutionDetailsPageReader(ref, reader)
        let page = await pageReader.fetch()
        expect(page.title).toBe('Work of the Special Committee to Investigate Israeli Practices Affecting the Human Rights of the Palestinian People and Other Arabs of the Occupied Territories : resolution / adopted by the General Assembly')
        expect(page.draftResolutionCode).toBe('A/C.4/78/L.13')
        expect(page.draftResolutionUrl).toBe('https://digitallibrary.un.org/record/4026563?ln=en')
        expect(page.votes.size).toBe(193)
        expect(page.votes.get('TÜRKİYE')).toBe('Y')
        expect(page.votes.get('UNITED STATES')).toBe('N')
        expect(page.collections.length).toBe(2)
        expect(page.collections[0]).toBe('General Assembly Plenary')
        expect(page.collections[1]).toBe('Voting Data')
    })

    test('DraftResolutionPageReader', async () => {
        let reader = new _FsReader()
        let pageReader = new DraftResolutionPageReader('draft#1', reader)
        let page = await pageReader.fetch()
        expect(page.symbol).toBe('A/ES-10/L.27')
        expect(page.title).toBe('Protection of civilians and upholding legal and humanitarian obligations : draft resolution / Algeria, Bahrain, Comoros, Djibouti, Egypt, Iraq, Jordan, Kuwait, Lebanon, Libya, Mauritania, Morocco, Oman, Qatar, Saudi Arabia, Somalia, Sudan, Tunisia, United Arab Emirates, Yemen and State of Palestine')
        expect(page.authors.length).toBe(97)
        expect(page.subjects.length).toBe(9)
        expect(page.subjects[0]).toBe('GAZA STRIP')        
    })
    
})
