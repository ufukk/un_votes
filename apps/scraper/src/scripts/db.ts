import "reflect-metadata"
import { defaultDataSource, getDefaultConnection, YearRange, ResolutionRepository, CountryRepository, AuthorRepository, AgendaRepository, SubjectRepository, ResolutionVoteRepository, ResolutionType, VotingType, ResolutionStatus, Vote, make_slug, SlugAliasRepository } from '@ufukk/shared/reader/models';
import { getResolutionVotes, findTopVotingPartners, findMatchingVotingCountries, findMostActiveCountries, fetchVotingData, clusterCountriesByVoting } from '@ufukk/shared/analysis/resolutions';
import { findFrequentVotingGroups, findFrequentVotingGroupsHier, findFrequentVotingGroupsFlat, findCountryGroup } from '@ufukk/shared/analysis/groups'
import { extractKeywords, extractNouns, extractKeywords2 } from '@ufukk/shared/analysis/keywords'
import { Like } from 'typeorm';

// Initialize the database connection
async function initializeDB() {
    if (!defaultDataSource.isInitialized) {
        await defaultDataSource.initialize();
        console.log('Database connected successfully.');
    }
}

// Query resolutions by year
async function queryResolutionsByYear(year: number, votingType: 'general' | 'security' | null = null) {
    const type = votingType == 'security' ? VotingType.SecurityCouncil : (votingType == 'general' ? VotingType.GeneralCouncil : null)
    const resolutionRepo = ResolutionRepository.createInstance(defaultDataSource);
    const count = await resolutionRepo.resolutionCountByYear(year, type)
    const resolutions = await resolutionRepo.resolutionsByYear(year, 50, 0, type);
    const voteRepo = ResolutionVoteRepository.createInstance(defaultDataSource);
    console.log(`Resolutions for year ${year} [Total: ${count}]:`);
    console.table(resolutions.map(res => ({
        Symbol: res.resolutionSymbol,
        Title: res.title.substring(0, 30),
        Date: res.date, // Format date as YYYY-MM-DD
        Status: ResolutionStatus[res.resolutionStatus],
    })));
}

// Query resolutions by agenda
async function queryResolutionsByAgenda(agendaName: string) {
    const agendaRepo = AgendaRepository.createInstance(defaultDataSource);
    const agenda = await agendaRepo.fetchByUnName(agendaName);
    if (!agenda) {
        console.log(`Agenda "${agendaName}" not found.`);
        return;
    }

    const resolutionRepo = ResolutionRepository.createInstance(defaultDataSource);
    const resolutions = await resolutionRepo.resolutionsByAgenda(agenda.agendaId, 50, 0);
    console.log(`Resolutions for agenda "${agendaName}":`);
    console.table(resolutions.map(res => ({
        Symbol: res.resolutionSymbol,
        Title: res.title,
        Date: res.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        Status: ResolutionStatus[res.resolutionStatus],
    })));
}

// Query countries by slug
async function queryCountries() {
    const countryRepo = CountryRepository.createInstance(defaultDataSource);
    const countries = await countryRepo.find({ order: { name: 'ASC' } });
    console.log(`Total of ${countries.length} countries`);
    console.table(countries.map(country => ({
        Name: country.name,
        Slug: country.slug,
    })));
}

// Query authors by name
async function queryAuthorByName(authorName: string) {
    const authorRepo = AuthorRepository.createInstance(defaultDataSource);
    const author = await authorRepo.findOneBy({ authorName });
    if (!author) {
        console.log(`Author "${authorName}" not found.`);
        return;
    }
    console.log(`Author details for "${authorName}":`);
    console.table([{
        Name: author.authorName,
        Country: author.country ? author.country.name : 'N/A',
    }]);
}

// Query subjects by name
async function querySubjects() {
    const subjectRepo = SubjectRepository.createInstance(defaultDataSource);
    const subjects = await subjectRepo.find({ order: { subjectName: 'ASC' } });
    console.table(subjects.map(sbj => ({ Name: sbj.subjectName })));
}

// Query subjects by name
async function queryAgendas(query: string) {
    const repo = AgendaRepository.createInstance(defaultDataSource);
    const names = (await repo.find({ where: { name: Like(`%${query}%`) }, order: { name: 'ASC' } })).map((agenda) => agenda.un_name)
    for (const keyword of names) {
        console.log(extractKeywords2(keyword));
    }
}

// Query votes for a resolution
async function queryVotesForResolution(symbol: string) {
    const resolutionRepo = ResolutionRepository.createInstance(defaultDataSource);
    const resolution = await resolutionRepo.findOne({
        where: { resolutionSymbol: symbol },
        relations: ['votes', 'votes.country'],
    });
    if (!resolution) {
        console.log(`Resolution with symbol "${symbol}" not found.`);
        return;
    }
    console.log(`Votes for resolution "${symbol}":`);
    console.table(resolution.votes.map(vote => ({
        Country: vote.country.name,
        Vote: Vote[vote.vote]
    })));
}

async function queryYearResolutionNumbers() {
    const resolutionRepo = ResolutionRepository.createInstance(defaultDataSource);
    const years = await resolutionRepo.getYearResolutionNumbers();
    console.log('Year Resolution Numbers:');
    console.table(years.map(year => ({
        Year: year.year,
        Total: year.total,
    })));
}

async function topVotingPartners(slug: string, start: number, finish: number, num: number, reverse: boolean = false) {
    const range = new YearRange(start, finish)
    console.log(`From ${range.start} to ${range.finish} ...`)
    const threshold = (finish - start) > 0 ? (finish - start) * 20 : (finish - start)
    const countries = await findMatchingVotingCountries(slug, range, threshold);
    const topCountries = countries.slice(0, num * 10).map(country => country.slug);
    const partners = await findTopVotingPartners(slug, num, topCountries, range, reverse);
    console.table(partners.map(partner => ({ Partner: partner.country, Alignment: partner.alignment })));
}

async function votingClusters() {
    const groups = await findFrequentVotingGroupsFlat(new YearRange(2023, 2024))
    const country = 'turkey'
    const group = findCountryGroup(country, groups)
    if (group) {
        console.log(`GROUP: ${group.group}`)
    } else {
        console.log(`NOT FOUND: ${country}`)
    }
    //const range = new YearRange(2023, 2025);
    //const clusters = await clusterCountriesByVoting(range)
    console.table(groups.map(grp => ({ Countries: grp.group.join(', '), Compability: grp.averageCompatibility })))
}

async function addAlias(slug: string, alias: string) {
    if (!slug || !alias) {
        console.log('a slug and an alias is required');
        return;
    }
    const repo = SlugAliasRepository.createInstance(defaultDataSource);
    const doesExist = await repo.existsBy({ alias: alias })
    if (doesExist) {
        console.log(`Alias ${alias} already exists`);
        return
    }
    const slugAlias = repo.create({ slug: slug, alias: alias });
    await repo.save(slugAlias)
    console.log(`Alias for ${slug} created`);
}

// Main function to handle command-line arguments
async function main() {
    await initializeDB();

    const command = process.argv[2];
    const arg = process.argv[3];

    switch (command) {
        case 'resolutions-by-year':
            const votingType = process.argv.length > 4 && (process.argv[4] === 'general' || process.argv[4] === 'security') ? process.argv[4] as 'general' | 'security' : null;
            await queryResolutionsByYear(Number(arg), votingType);
            break;
        case 'resolutions-by-agenda':
            await queryResolutionsByAgenda(arg);
            break;
        case 'countries':
            await queryCountries();
            break;
        case 'author-by-name':
            await queryAuthorByName(arg);
            break;
        case 'subjects':
            await querySubjects();
            break;
        case 'agendas':
            await queryAgendas(arg);
            break;
        case 'votes-for-resolution':
            await queryVotesForResolution(arg);
            break;
        case 'query-year-resolution-numbers':
            await queryYearResolutionNumbers();
            break;
        case 'top-voting-partners':
            await topVotingPartners(arg, Number(process.argv[4]), Number(process.argv[5]), process.argv.length > 6 ? Number(process.argv[6]) : 10, process.argv.length >= 8 && process.argv[7] == '0');
            break
        case 'voting-clusters':
            await votingClusters();
            break
        case 'add-alias':
            await addAlias(arg, process.argv[4]);
            break
        case '---empty-all-tables-----':
            await emptyAllTables();
            break;
        case 'make-slug':
            console.log(make_slug(arg));
            break;
        default:
            console.log('Available commands:');
            console.log('- resolutions-by-year <year>');
            console.log('- resolutions-by-agenda <agendaName>');
            console.log('- countries');
            console.log('- agendas');
            console.log('- author-by-name <authorName>');
            console.log('- subjects');
            console.log('- votes-for-resolution <symbol>');
            console.log('- query-year-resolution-numbers');
            console.log('- top-voting-partners <slug>');
            console.log('- voting-clusters');
            console.log('- make-slug');
            console.log('- add-alias <slug> <alias>');
            break;
    }

    // Close the database connection
    await defaultDataSource.destroy();
    console.log('Database connection closed.');
}

export async function emptyAllTables(): Promise<void> {
    await initializeDB();
    const entityManager = defaultDataSource.createEntityManager();
    for (const table of ['resolution_vote', 'resolution_authors_author', 'resolution_subjects_subject', 'resolution_agendas_agenda', 'document_url', 'resolution', 'read_cursor', 'author', 'agenda', 'subject']) {
        //await entityManager.query(`DELETE FROM ${table}`);
    }
}

// Run the script
main().catch(err => {
    console.error('Error:', err);
});

/*
npx typeorm migration:generate src/migrations/AddDateIndex -d path-to-data-source
npx typeorm migration:run -d path-to-data-source
*/