import axios, { AxiosHeaders, AxiosResponse } from 'axios'
import { JSDOM } from 'jsdom'

class PathError extends Error {
    constructor(path: string) {
        super(`html path not found: ${path}`)
    }
}

class AttributeError extends Error {
    constructor(path: string, key: string) {
        super(`attribute not found: ${path} [${key}]`)
    }
}

export class ResolutionReference {

    constructor(
        public readonly title: string,
        public readonly date: Date,
        public readonly resolutionCode: string,
        public readonly url: string)
    {
    }
}

class ResolutionListPage {

    constructor(
        public readonly numberOfRecords: number,
        public readonly resolutions: Array<ResolutionReference>) {
    }
}

class ResolutionCursor {

    constructor(
        public readonly start: number,
        public readonly end: number,
        public readonly page: number,
        public readonly resolutionList: ResolutionListPage) {
    }
}

export class ResolutionDetailsPage {

    constructor(public readonly title: string,
        public readonly agendas: string[],
        public readonly resolutionCode: string,
        public readonly meetingRecordCode: string,
        public readonly draftResolutionCode: string,
        public readonly committeeReportCode: string,
        public readonly note: string,
        public readonly voteSummary: string,
        public readonly voteDate: Date,
        public readonly votes: Map<string, string>,
        public readonly collections: string[]
    ) {
    }
}

export class HtmlParser {

    data: string
    domDocument: JSDOM

    constructor(data: string) {
        this.domDocument = new JSDOM(data)
    }

    private __el(el: Element | null): Element | Document {
        return el != null ? el : this.domDocument.window.document
    }

    protected _sure_first(el: Element | Document, query: string): Element {
        let found = el.querySelector(query) as Element
        if(found == null) {
            throw new PathError(query)
        }
        return found
    }

    find(query: string, parent: Element = null): Element {
        let el = this.__el(parent)
        return this._sure_first(el, query)
    }

    search(query: string, parent: Element = null): NodeListOf<Element> {
        let el = this.__el(parent)
        return el.querySelectorAll(query) as NodeListOf<Element>
    }

    text(query: string): string {
        return this.find(query).textContent as string
    }

    attribute(query: string, key: string): string {
        let value = this.find(query).attributes.getNamedItem(key)?.value as string
        return value
    }
}

abstract class ParserValue {
    
    constructor(public readonly query: string) {    }

    abstract valueOf(parser: HtmlParser, element: Element | null): any

}

class ParserValueText extends ParserValue {
    
    valueOf(parser: HtmlParser, element: Element | null): string {
        return parser.find(this.query, element).textContent
    }

}

class ParserValueAttribute extends ParserValue {

    constructor(query: string, public readonly name: string) {
        super(query)
    }

    valueOf(parser: HtmlParser, element: Element | null): string {
        return parser.find(this.query, element).attributes[this.name].value
    }
}

class ParserValueList extends ParserValue {
    
    constructor(query: string, public readonly subQueries: Record<string, ParserValue>) {
        super(query)
    }

    valueOf(parser: HtmlParser, element: Element | null): Record<string, string>[] {
        let results = []
        parser.search(this.query, element).forEach((el: Element) => {
            let item = {}
            for(let key in this.subQueries) {
                let parserValue = this.subQueries[key]
                item[key] = parserValue.valueOf(parser, el)
            }
        })
        return results
    }
    
}

export abstract class UrlReader {

    abstract readUrl(url: string): Promise<boolean>

    abstract isSuccess(): boolean

    abstract data(): any

}

export class AxiosUrlReader extends UrlReader {
    
    public response: AxiosResponse
    public lastUrl: string

    public getHeaders(): AxiosHeaders  {
        let headers = new AxiosHeaders()
        headers.set('Accept', 'text/html')
        headers.set('Accept-Encoding', 'gzip, deflate, br')
        headers.set('Accept-Language', 'en-US,en;q=0.5')
        headers.set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0')
        return headers
    }

    async readUrl(url: string) {
        this.lastUrl = url
        this.response = await axios.get(url, {headers: this.getHeaders()})
        return this.isSuccess()
    }

    isSuccess(): boolean {
        return this.response.status == 200
    }

    data(): any {
        return this.response.data
    }

}

abstract class PageReader<T> {

    protected _parser: HtmlParser
    protected _queries: Record<string, ParserValue>

    constructor(public readonly url: string, public readonly reader: UrlReader) {
    }

    protected async _read() {

        this.reader.readUrl(this.url)
        this._parser = new HtmlParser(this.reader.data())
    }

    public async fetch(): Promise<T> {
        await this._read()
        let result = this._parse()
        return result
    }

    protected _readQueries(): Record<string,any> {
        if(this._queries == undefined)
            return
        let result = {}
        for(let name in this._queries) {
            let query = this._queries[name]
            result[name] = query.valueOf(this._parser, null)
        }
        return result
    }

    protected abstract _parse(): T
}

export class ResolutionListPageReader extends PageReader<ResolutionListPage> {
    
    
    static readonly pageSize: number = 50
    static readonly rootUrl = 'https://digitallibrary.un.org'
    static readonly indexUrl = 'https://digitallibrary.un.org/search?cc=Voting+Data&ln=en&c=Voting+Data'
    protected _queries = {
        'numberOfRecords': new ParserValueText('td.searchresultsboxheader>span>strong'),
        'references': 
                new ParserValueList('div.result-row',{
                    'title': new ParserValueText('.result-title>a'),
                    'brief-options': new ParserValueText('.brief-options'),
                    'url': new ParserValueAttribute('a.moreinfo', 'href')
                })
        }
    

    public static getUrl(page: number) {
        if (page == 1)
            return this.rootUrl
        let start = (page -1) * this.pageSize
        return this.indexUrl + `&rg=${start}&jrec=${start+this.pageSize+1}`
    }

    constructor(public readonly page: number, reader: UrlReader) {
        super(ResolutionListPageReader.getUrl(page), reader)
    }

    public numberToPage(total: number): number {
        return Math.ceil(total / ResolutionListPageReader.pageSize)
    }

    protected _readQueries(): Record<string, string> {
        let values = {}
        values['numberOfRecords'] = Number.parseInt(this._parser.text('td.searchresultsboxheader>span>strong').replace(',',''))
        values['references'] = []
        let titles = this._parser.search('div.result-title>a')
        let briefOptions = this._parser.search('div.brief-options')
        let links = this._parser.search('a.moreinfo')
        titles.forEach((el, i: number) => {
            values['references'].push({
                'title': el.textContent,
                'brief-options': briefOptions[i].textContent,
                'url': ResolutionListPageReader.rootUrl + links[i].attributes['href'].value})
        })
        return values
    }

    protected _parse(): ResolutionListPage {
        let values = this._readQueries()
        let references = []
        let numberOfRecords = Number.parseInt(values['numberOfRecords'])
        for(let ref of values['references']) {
            let title = ref['title']
            let url = ref['url']
            let options: string = ref['brief-options'].trim().split('|')
            let code = options[0]
            let dt = options[1].trim()
            let date = new Date(Date.parse(dt))
            references.push(new ResolutionReference(title, date, code, url))
        }
        return new ResolutionListPage(numberOfRecords, references)
    }
}

export class ResolutionDetailsPageReader extends PageReader<ResolutionDetailsPage> {
    

    constructor(public readonly reference: ResolutionReference, reader: UrlReader) {
        super(reference.url, reader)
    }

    private __getVotes(value: string): Map<string, string> {
        let votes = new Map<string, string>()
        let matches = value.matchAll(/ *([YNA] )*([^<>]{3,})/g)
        let done = false
        while(!done) {
            let match = matches.next()
            done = match.done
            let m: RegExpExecArray = match.value
            if(!m || done)
                break
            let name = m[2]
            let vote = m[1] ? m[1].trim() : 'M'
            votes.set(name, vote)
        }
        return votes
    }

    protected _readQueries(): Record<string, any> {
        let results = {}
        let titles = this._parser.search('span.title')
        let values = this._parser.search('span.value')
        let htmlFields = ['Vote', 'Collections']
        titles.forEach((el: Element, index) => {
            let name = el.textContent.trim()
            let value = htmlFields.includes(name) ? values[index].innerHTML.trim() : values[index].textContent.trim()
            results[name] = value
        })
        return results
    }

    protected _parse(): ResolutionDetailsPage {
        let values = this._readQueries()
        let voteDate = new Date(Date.parse(values['Vote date']))
        let collections = []
        values['Collections'].split(/<[ ]*br[ \/]*>/).forEach((txt: string) => {
            collections.push(txt.replace(/<\/?[^>]+(>|$)/g, ''))
        })
        let votes = this.__getVotes(values['Vote'])
        let resolution = new ResolutionDetailsPage(
            values['Title'],
            values['Agenda'].split('/'),
            values['Resolution'],
            values['Meeting record '],
            values['Draft resolution'],
            values['Committee report'],
            values['Note'],
            values['Vote summary'],
            voteDate,
            votes,
            collections
        )
        return resolution
    }
}

function report(msg: string) {
    console.log(msg)
}

export async function read_pages(start: number, end: number): Promise<Array<ResolutionDetailsPage>> {
    let results: Array<ResolutionDetailsPage> = []
    let reader = new AxiosUrlReader()
    for(let page = start; page < end + 1; page++) {
        report(`Reading page ${page} ...`)
        let listPage = await new ResolutionListPageReader(page, reader).fetch()
        report(`Fetching ${listPage.resolutions.length} items...`)
        listPage.resolutions.forEach(async (ref, i) => {
            let detailsPage = await new ResolutionDetailsPageReader(ref, reader).fetch()
            results.push(detailsPage)
            report(`Item: ${i}.`)
        })
    }
    return results
}
