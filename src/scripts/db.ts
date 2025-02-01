import "reflect-metadata"
import { defaultDataSource, ResolutionRepository, CountryRepository, AuthorRepository, AgendaRepository, SubjectRepository, ResolutionVoteRepository, ResolutionType, VotingType, ResolutionStatus, Vote } from '../reader/models';
import { getResolutionVotes, findTopVotingPartners, findMatchingVotingCountries } from '../analysis/resolutions';

// Initialize the database connection
async function initializeDB() {
    if (!defaultDataSource.isInitialized) {
        await defaultDataSource.initialize();
        console.log('Database connected successfully.');
    }
}

// Query resolutions by year
async function queryResolutionsByYear(year: number) {
    const resolutionRepo = ResolutionRepository.createInstance(defaultDataSource);
    const count = await resolutionRepo.resolutionCountByYear(year)
    const resolutions = await resolutionRepo.resolutionsByYear(year, 50, 0);
    console.log(`Resolutions for year ${year} [Total: ${count}]:`);
    console.table(resolutions.map(res => ({
        Symbol: res.symbol,
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
    const resolutions = await resolutionRepo.resolutionsByAgenda(agenda.agenda_id, 50, 0);
    console.log(`Resolutions for agenda "${agendaName}":`);
    console.table(resolutions.map(res => ({
        Symbol: res.symbol,
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
async function querySubjectByName(subjectName: string) {
    const subjectRepo = SubjectRepository.createInstance(defaultDataSource);
    const subject = await subjectRepo.fetchByName(subjectName);
    if (!subject) {
        console.log(`Subject "${subjectName}" not found.`);
        return;
    }
    console.log(`Subject details for "${subjectName}":`);
    console.table([{
        Name: subject.subjectName,
    }]);
}

// Query votes for a resolution
async function queryVotesForResolution(symbol: string) {
    const resolutionRepo = ResolutionRepository.createInstance(defaultDataSource);
    const resolution = await resolutionRepo.findOne({
        where: { symbol },
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

async function topVotingPartners(slug, num: number) {
    const selected = ['united-states', 'germany', 'france', 'turkey', 'romania', 'india', 'norway', 'netherlands', 'israel', 'greece', 'switzerland', 'sweden']
    if(!(slug in selected)) {
        selected.push(slug)
    }
    const countries = await findMatchingVotingCountries(slug, 200);
    const topCountries = countries.slice(0, num * 5).map(country => country.slug);
    const partners = await findTopVotingPartners(slug, num, topCountries);
    console.table(partners.map(partner => ({ Partner: partner.country, Alignment: partner.alignment })));
}

// Main function to handle command-line arguments
async function main() {
    await initializeDB();

    const command = process.argv[2];
    const arg = process.argv[3];

    switch (command) {
        case 'resolutions-by-year':
            await queryResolutionsByYear(Number(arg));
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
        case 'subject-by-name':
            await querySubjectByName(arg);
            break;
        case 'votes-for-resolution':
            await queryVotesForResolution(arg);
            break;
        case 'query-year-resolution-numbers':
            await queryYearResolutionNumbers();
            break;
        case 'top-voting-partners':
            await topVotingPartners(arg, process.argv.length > 4 ? Number(process.argv[4]) : 10);
            break
        case 'empty-all-tables':
            await emptyAllTables();
            break;
        default:
            console.log('Available commands:');
            console.log('- resolutions-by-year <year>');
            console.log('- resolutions-by-agenda <agendaName>');
            console.log('- countries');
            console.log('- author-by-name <authorName>');
            console.log('- subject-by-name <subjectName>');
            console.log('- votes-for-resolution <symbol>');
            console.log('- query-year-resolution-numbers');
            console.log('- top-voting-partners <slug>');
            console.log('- empty-all-tables');
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