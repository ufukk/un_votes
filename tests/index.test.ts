import { Resolution } from '../src/reader/models'
import { HtmlParser, ResolutionListPageReader, ResolutionDetailsPageReader, ResolutionReference, UrlReader } from '../src/reader/crawler'
import * as fs from 'fs'

class _FsReader extends UrlReader {
    
    private _data

    readUrl(url: string): Promise<boolean> {
        let path =  url.indexOf('record') < 0 ? 'tests/files/un-voting-list.html' : 'tests/files/un-voting-details.html' 
        this._data = fs.readFileSync(path, 'utf-8')
        return new Promise<boolean>(() => {return true})
    }
    isSuccess(): boolean {
        return true
    }
    data() {
        return this._data
    }
    
}


describe('first test collection', () => {
    test('first unit test', () => {
        expect('101').toBe('101')
    })
    
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
        reader.readUrl('')
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
        let ref = new ResolutionReference('', new Date(), '', 'https://digitallibrary.un.org/record/4029891?ln=en')
        let pageReader = new ResolutionDetailsPageReader(ref, reader)
        let page = await pageReader.fetch()
        expect(page.votes.get('TÜRKİYE')).toBe('Y')
        expect(page.votes.get('UNITED STATES')).toBe('N')
    })
    
})
