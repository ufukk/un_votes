import { ok } from 'assert'
import { default as axios } from 'axios'
import { JSDOM } from 'jsdom'
import * as fs from 'fs' 

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

export interface Cascading {

    
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

export const YES_VALUE = 'Y'

export const NO_VALUE = 'N'

export const ABSTENTION_VALUE = 'A'

export const NONVOTING_VALUE = '-'

export class ResolutionDetailsPage {

    constructor(public readonly title: string,
        public readonly agendas: string[],
        public readonly resolutionCode: string,
        public readonly parentResolutionUrl: string,
        public readonly meetingRecordCode: string,
        public readonly draftResolutionCode: string,
        public readonly draftResolutionUrl: string,
        public readonly committeeReportCode: string,
        public readonly note: string,
        public readonly voteSummary: string,
        public readonly voteDate: Date,
        public readonly detailsUrl: string,
        public readonly votes: Map<string, string>,
        public readonly collections: string[]
    ) {  

        
      }

    protected _votesByValue(value: string): string[] {
        return Array.from(this.votes.keys()).filter((key) => this.votes.get(key) == value)
    }

    public yes_votes(): string[] {
        return this._votesByValue(YES_VALUE)
    }

    public no_votes(): string[] {
        return this._votesByValue(NO_VALUE)
    }

    public abstention_votes(): string[] {
        return this._votesByValue(ABSTENTION_VALUE)
    }

    public nonvoting_votes(): string[] {
        return this._votesByValue(NONVOTING_VALUE)
    }
}

export class DraftResolutionPage {

    constructor(public readonly symbol: string,
        public readonly title: string,
        public readonly access: string,
        public readonly resolutionOrDecision,
        public readonly authors: string[],
        public readonly agendaInformation: string,
        public readonly date: Date,
        public readonly description: string,
        public readonly notes: string,
        public readonly detailsUrl: string,
        public readonly collections: string[],
        public readonly subjects: string[],
                
    ) {}
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
            results.push(item)
        })
        return results
    }
    
}

export interface UrlReader {

    readUrl(url: string): Promise<boolean>

    isSuccess(): boolean

    data(): any

    responseData(): any

}

export class AxiosUrlReader implements UrlReader {
    
    public response: axios.AxiosResponse
    public lastUrl: string

    public getHeaders(): Record<string, string>  {
        let values = {'Accept': 'text/html',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.5',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0'
        }
        return values
    }

    async readUrl(url: string): Promise<boolean> {
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

    responseData(): any {
        return this.response
    }
}

export class CachedAxiosUrlReader extends AxiosUrlReader {

    private __cachedData: string
    private __encoding: BufferEncoding = 'utf-8'

    private __cachePath(url: string) {
        const name = url.replace(/^(http)(s*):\/\/|[^a-zA-Z0-9]/g, '')
        const cache_path = process.env.CACHE_PATH ? process.env.CACHE_PATH : 'storage/cache'
        return [cache_path, name].join('/')
    }

    private __isCached(url: string): boolean {
        return fs.existsSync(this.__cachePath(url))
    }

    private __fromCache(url: string): string {
        const data = fs.readFileSync(this.__cachePath(url), this.__encoding)
        return data
    }

    private __writeCache(url: string, data: string) {
        const path = this.__cachePath(url)
        fs.writeFileSync(path, data)
    }

    public data(): any {
        return this.__cachedData != undefined ? this.__cachedData : super.data()
    }

    async readUrl(url: string, useCache=true): Promise<boolean> {
        if(useCache && this.__isCached(url)) {
            this.__cachedData = this.__fromCache(url)
            return new Promise<boolean>((resolve) => resolve(true))
        } else {
            const result = await super.readUrl(url)
            if(result) {
                this.__writeCache(url, this.data())
            }
            return result
        }
    }
}

abstract class PageReader<T> {

    protected _parser: HtmlParser
    protected _queries: Record<string, ParserValue>

    constructor(public readonly url: string, public readonly reader: UrlReader) {
    }

    protected async _read() {
        const isSuccessful = await this.reader.readUrl(this.url)
        if(!isSuccessful) {
            throw Error(`Url: ${this.url} failed: ${this.reader.responseData().status}`)
        }
        this._parser = new HtmlParser(this.reader.data())
    }

    public async fetch(): Promise<T> {
        await this._read()
        let result = await this._parse()
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

class GatewayPage {


    public constructor(public readonly years: number[]) { 
    }

}

export class GatewayReader extends PageReader<GatewayPage> {

    static readonly gatewayUrl = 'https://digitallibrary.un.org/search?cc=Voting+Data&ln=en&c=Voting+Data'

    constructor(public readonly reader: UrlReader) {
        super(GatewayReader.gatewayUrl, reader)
    }

    protected findYears(): number[] {
        return Array.from(new Set<number>(Array.from(this._parser.search('li>div>label>span'))
        .filter((node) => node.textContent.trim().match(/^[1|2]\d{3}$/gm))
        .map((node) => Number.parseInt(node.textContent.trim()))))
    }

    protected _parse(): GatewayPage {
        const years = this.findYears()
        return new GatewayPage(years)
    }

}

export class ResolutionListPageReader extends PageReader<ResolutionListPage> {
    
    static readonly pageSize: number = 50
    static readonly rootUrl = 'https://digitallibrary.un.org'
    static readonly indexUrl = 'https://digitallibrary.un.org/search?cc=Voting+Data&ln=en&c=Voting+Data'
    protected _queries = {}

    public static getUrl(page: number, year: number) {
        if (page == 1) {
            return this.indexUrl + `&fct__3=${year}`
        }
        let end = ((page - 1) * this.pageSize) + 1
        return this.indexUrl + `&rg=${this.pageSize}&jrec=${end}&fct__3=${year}`
    }

    constructor(public readonly page: number, public readonly year: number, reader: UrlReader) {
        super(ResolutionListPageReader.getUrl(page, year), reader)
        report(`URL: ${this.url}`)
    }

    public static numberToPage(total: number): number {
        return Math.ceil(total / ResolutionListPageReader.pageSize)
    }

    protected _readQueries(): Record<string, string> {
        let values = {}
        values['numberOfRecords'] = Number.parseInt(this._parser.text('td.searchresultsboxheader>span>strong').replace(',',''))
        values['references'] = []
        let titles = this._parser.search('div.result-title>a')
        let briefOptions = this._parser.search('div.brief-options')
        let links = Array.from(this._parser.search('a.moreinfo'))
            .map((val: Element) => val.attributes['href'].value)
            .filter((value: string) => value.startsWith('/record'))
        ok(links.length == titles.length)
        titles.forEach((el, i: number) => {
            values['references'].push({
                'title': el.textContent,
                'brief-options': briefOptions[i].textContent,
                'url': ResolutionListPageReader.rootUrl + links[i]})
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

export class DraftResolutionPageReader extends PageReader<DraftResolutionPage> {
    
    protected _readQueries(): Record<string, any> {
        let results = {}
        let titles = this._parser.search('span.title')
        let values = this._parser.search('span.value')
        let htmlFields = ['Authors', 'Collections']
        titles.forEach((el: Element, index) => {
            let name = el.textContent.trim()
            let value = htmlFields.includes(name) ? values[index].innerHTML.trim() : values[index].textContent.trim()
            results[name] = value
        })
        return results
    }

    private __getAuthors(authorStr: string): string[] {
        return Array.from(new Set<string>(Array.from(authorStr.matchAll(/<a[^>]*href=\"([^\"]+)\"[^>]*>([\w ]+)<\/a>/g))
        .map((match: RegExpExecArray) => match[2])))
    }

    private __getDate(value: string): Date {
        const dateStr = value.substring(value.indexOf(',') + 1)
        return new Date(Date.parse(dateStr))
    }

    private __getSubjects(): string[] {
        const container = this._parser.find('ul.rs-group-list')
        return Array.from(new Set<string>(Array.from(container.querySelectorAll('a.rs-link'))
        .map((el: Element) => el.textContent)))
    }

    protected _parse(): DraftResolutionPage {
        let values = this._readQueries()
        let collections = []
        values['Collections'].split(/<[ ]*br[ \/]*>/).forEach((txt: string) => {
            collections.push(txt.replace(/<\/?[^>]+(>|$)/g, ''))
        })
        
        let resolution = new DraftResolutionPage(
            values['Symbol'],
            values['Title'],
            values['Access'],
            values['Resolution / Decision'],
            values['Authors'] ? this.__getAuthors(values['Authors']) : [],
            values['Agenda information '],
            this.__getDate(values['Date']),
            values['Description'],
            values['Notes'],
            this.url,
            collections,
            this.__getSubjects()
        )
        return resolution
    }
    
}

export class ResolutionDetailsPageReader extends PageReader<ResolutionDetailsPage> {
    

    constructor(public readonly reference: ResolutionReference, reader: UrlReader) {
        super(reference.url, reader)
    }

    private __getVotes(value: string): Map<string, string> {
        let votes = new Map<string, string>()
        if (value == undefined) {
            return votes
        }
        let matches = value.matchAll(/ *([YNA] )*([^<>]{4,})/g)
        let done = false
        while(!done) {
            let match = matches.next()
            done = match.done
            let m: RegExpExecArray = match.value
            if(!m || done)
                break
            let name = m[2]
            let vote = m[1] ? m[1].trim() : NONVOTING_VALUE
            votes.set(name, vote)
        }
        return votes
    }

    protected _readQueries(): Record<string, any> {
        let results = {}
        let titles = this._parser.search('span.title')
        let values = this._parser.search('span.value')
        let htmlFields = ['Vote', 'Collections', 'Draft resolution', 'Resolution']
        titles.forEach((el: Element, index) => {
            let name = el.textContent.trim()
            let value = htmlFields.includes(name) ? values[index].innerHTML.trim() : values[index].textContent.trim()
            results[name] = value
        })
        return results
    }

    private __readDraftValues(value: string): [string, string] {
        if(value == null) {
            return [null, null]
        }
        const matches = value.match(/<a[^>]+href="([^"]+)">([^<]+)<\/a>/)
        return matches ? [matches[2], matches[1]] : [value, null]
    }

    protected _parse(): ResolutionDetailsPage {
        const values: Record<string, string> = this._readQueries()
        const voteDate = new Date(Date.parse(values['Vote date']))
        const collections = []
        const separator = '&gt;'
        values['Collections'].split(/<[ ]*br[ \/]*>/).forEach((txt: string) => {
            const parts = txt.replace(/<\/?[^>]+(>|$)/g, '').split(separator)
            collections.push(parts[parts.length - 1].trim())
        })
        const votes = this.__getVotes(values['Vote'])
        let [draftTextCode, draftTextUrl] = this.__readDraftValues(values['Draft resolution'])
        const [resolutionCode, parentResolutionUrl] = this.__readDraftValues(values['Resolution'])
        /* workaround for resolutions without a draft: use resolution instead. */
        if(!draftTextCode && parentResolutionUrl) {
            draftTextCode = resolutionCode
            draftTextUrl = parentResolutionUrl
        }
        const resolution = new ResolutionDetailsPage(
            values['Title'],
            Array.from(new Set<string>(values['Agenda'].split('/'))),
            resolutionCode,
            parentResolutionUrl,
            values['Meeting record '],
            draftTextCode,
            draftTextUrl,
            values['Committee report'],
            values['Note'],
            values['Vote summary'],
            voteDate,
            this.url,
            votes,
            collections
        )
        return resolution
    }
}

function report(msg: string) {
    console.log(msg)
}

export async function read_pages(years: number[], batch: (result: {resolutions: ResolutionDetailsPage[], drafts: DraftResolutionPage[], year: number}) => Promise<void>): Promise<void> {
    const resolutions: ResolutionDetailsPage[] = []
    const drafts: DraftResolutionPage[] = []
    const concurrent = 6
    let numberOfPages = 0
    let numberOfRecords = 0
    let currentPage = 1
    let running = 0
    let j = 0
    let listPage: ResolutionListPage = null
    let listFreeze = false
    let ref_queue: ResolutionReference[]
    let yearIndex = 0

    const gatewayPage = await new GatewayReader(new AxiosUrlReader()).fetch()
    years = years || gatewayPage.years
    report(`Total ${years.length} years...`)
    const missing = years.filter((year) => gatewayPage.years.indexOf(year) == -1)
    if(missing.length > 0) {
        throw new Error(`missing years: ${missing}`)
    }

    const process_year = function() {
        return new Promise<void>(async resolve => {
            if(!listFreeze && numberOfPages) {
                listFreeze = true
                if(currentPage == numberOfPages) {
                    batch({drafts: drafts, resolutions: resolutions, year: years[yearIndex]})
                    if(yearIndex < years.length - 1) {
                        yearIndex++
                        currentPage = 1
                    } else {
                        resolve()
                        return
                    }
                } else {
                    currentPage++
                }
                listFreeze = false
            }
            listPage = await new ResolutionListPageReader(currentPage, years[yearIndex], new AxiosUrlReader()).fetch()
            numberOfRecords = listPage.numberOfRecords
            numberOfPages = ResolutionListPageReader.numberToPage(numberOfRecords)
            ref_queue = Array.from(listPage.resolutions)
            report(`LIST: ${years[yearIndex]}: ${currentPage} <${numberOfPages}/${numberOfRecords}>`)
            j = 0
            for(j;j<Math.min((concurrent - running), ref_queue.length);j++) {
                process_details(ref_queue.pop())
            }
            listFreeze = false
        })
    }

    const process_details = function(reference: ResolutionReference) {
        return new Promise<void>(async (resolve) => {
            running++
            const details = await new ResolutionDetailsPageReader(reference, new CachedAxiosUrlReader())
                .fetch()

            resolutions.push(details)

            report(`reading details: ${reference.resolutionCode} [${resolutions.length}]`)
            if(details.draftResolutionUrl != null) {
                const draft = await new DraftResolutionPageReader(details.draftResolutionUrl, new CachedAxiosUrlReader())
                    .fetch()
                drafts.push(draft)
            }

            running--
            if(running < concurrent) {
                let refFinished = false
                for(let j=0;j<(concurrent - running);j++) {
                    const ref = ref_queue.pop()
                    if(ref != undefined) {
                        process_details(ref)
                    } else {
                        refFinished = true
                        break  
                    }
                }
                if(refFinished && running == 0) {
                    process_year()
                }
            }

        })
    }
    process_year()
}
