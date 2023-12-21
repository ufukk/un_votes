import exp from 'constants'
import { HtmlParser, DraftResolutionPageReader, ResolutionListPageReader, ResolutionDetailsPageReader, ResolutionReference, UrlReader } from '../src/reader/crawler'
import * as fs from 'fs'

class _FsReader extends UrlReader {
    
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
    
    test('ResolutionListPageReader', async () => {
        let reader = new _FsReader()
        let pageReader = new ResolutionListPageReader(1, reader)
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
        expect(page.votes.size).toBe(193)
        expect(page.votes.get('TÜRKİYE')).toBe('Y')
        expect(page.votes.get('UNITED STATES')).toBe('N')
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
