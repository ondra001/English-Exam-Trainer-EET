/* CAE Ace — offline sample sets (CAE.mock).
 * Used only when the API mode is 'mock' (dev/demo). One schema-valid,
 * plausible C1-level fixture per part, plus a writing assessment and
 * speaking prompts. Every fixture passes CAE.prompts.PARTS[id].validate(). */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const sets = {};

  sets.rue1 = {
    instructions: 'For questions 1–8, read the text and decide which answer (A, B, C or D) best fits each gap.',
    title: 'Bees above the city',
    text: 'City rooftops might seem an unlikely [[1]] for wildlife, yet a growing number of urban beekeepers are [[2]] hives above busy streets. Enthusiasts claim that bees actually [[3]] in cities, where gardens and parks provide flowers [[4]] much of the year. Curiously, urban honey often [[5]] a richer flavour than its rural counterpart, because the bees [[6]] on such a wide variety of plants.\n\nNot everyone is convinced, however. Some ecologists have [[7]] doubts about the trend, warning that too many hives can put pressure on wild pollinators, which must [[8]] with honeybees for a limited supply of nectar.',
    questions: [
      { number: 1, options: { A: 'venue', B: 'backdrop', C: 'haven', D: 'residence' }, answer: 'C', explanation: '“A haven for wildlife” is the fixed collocation meaning a safe place; a venue hosts events and a backdrop is scenery.' },
      { number: 2, options: { A: 'installing', B: 'assembling', C: 'mounting', D: 'erecting' }, answer: 'A', explanation: 'You install equipment such as hives; “erect” collocates with large structures and “assemble” with flat-pack parts.' },
      { number: 3, options: { A: 'prosper', B: 'thrive', C: 'bloom', D: 'advance' }, answer: 'B', explanation: '“Thrive in” is the natural collocation for living things doing well in an environment.' },
      { number: 4, options: { A: 'along', B: 'throughout', C: 'during', D: 'over' }, answer: 'B', explanation: '“Throughout much of the year” expresses continuous duration; “during” would need a specific event or period.' },
      { number: 5, options: { A: 'boasts', B: 'carries', C: 'holds', D: 'owns' }, answer: 'A', explanation: '“Boast” means to have a desirable feature — food “boasts a rich flavour”.' },
      { number: 6, options: { A: 'gorge', B: 'graze', C: 'feed', D: 'dine' }, answer: 'C', explanation: 'Animals “feed on” plants; “gorge on” means eat greedily and “graze” describes cattle.' },
      { number: 7, options: { A: 'raised', B: 'lifted', C: 'thrown', D: 'placed' }, answer: 'A', explanation: 'You “raise doubts” (or concerns); the other verbs do not collocate with “doubts”.' },
      { number: 8, options: { A: 'contest', B: 'compete', C: 'contend', D: 'rival' }, answer: 'B', explanation: '“Compete with somebody for something” fits the structure; “contend with” means to deal with a difficulty.' },
    ],
  };

  sets.rue2 = {
    instructions: 'For questions 1–8, read the text and type ONE word in each gap.',
    title: 'A long journey in a small leaf',
    text: 'Few drinks have [[1]] as long a journey as tea. Although it is now consumed all [[2]] the world, tea was once [[3]] luxury that only the wealthy could afford. It was not [[4]] the seventeenth century that the first shipments reached Europe, [[5]] they caused an immediate sensation.\n\nMerchants competed fiercely with [[6]] another to bring back the freshest leaves, and fortunes were made — and lost — in [[7]] process. [[8]] tea eventually became affordable to everyone, the elaborate rituals surrounding it survived.',
    answers: [
      { number: 1, answer: 'had', accepted: ['made'], explanation: 'Present perfect: “have had/made a long journey”.' },
      { number: 2, answer: 'over', accepted: ['around', 'across'], explanation: '“All over/around the world” is a fixed phrase.' },
      { number: 3, answer: 'a', accepted: [], explanation: 'The indefinite article: “a luxury”.' },
      { number: 4, answer: 'until', accepted: ['till'], explanation: 'The cleft structure “It was not until … that …”.' },
      { number: 5, answer: 'where', accepted: [], explanation: 'A relative clause referring to Europe: “…Europe, where they caused a sensation”.' },
      { number: 6, answer: 'one', accepted: [], explanation: 'The reciprocal pronoun “one another”.' },
      { number: 7, answer: 'the', accepted: [], explanation: '“In the process” is a fixed phrase.' },
      { number: 8, answer: 'although', accepted: ['though', 'while', 'when'], explanation: 'A concessive linker introduces the contrast between affordability and surviving rituals.' },
    ],
  };

  sets.rue3 = {
    instructions: 'For questions 1–8, use the word in CAPITALS to form a word that fits the gap.',
    title: 'Why sleep matters',
    text: 'Scientists have long been fascinated by the [[1]] between sleep and memory. During the night, the brain quietly [[2]] the connections formed during the day, a process that appears to be [[3]] for learning. People who are [[4]] deprived of deep sleep often struggle to concentrate, and their [[5]] on simple tasks declines [[6]].\n\nPerhaps most [[7]], chronic lack of sleep has been linked to a range of serious illnesses, which makes a good night’s rest not a luxury but an absolute [[8]].',
    answers: [
      { number: 1, root: 'RELATE', answer: 'relationship', accepted: [], explanation: 'A noun is needed after “the”: relationship between X and Y.' },
      { number: 2, root: 'STRONG', answer: 'strengthens', accepted: [], explanation: 'A third-person verb: adjective “strong” → verb “strengthen” + -s.' },
      { number: 3, root: 'ESSENCE', answer: 'essential', accepted: [], explanation: 'An adjective after “to be”: essence → essential.' },
      { number: 4, root: 'REPEAT', answer: 'repeatedly', accepted: [], explanation: 'An adverb modifying “deprived”: repeat → repeated → repeatedly.' },
      { number: 5, root: 'PERFORM', answer: 'performance', accepted: [], explanation: 'A noun after “their”: perform → performance.' },
      { number: 6, root: 'DRAMA', answer: 'dramatically', accepted: [], explanation: 'An adverb describing how it declines: drama → dramatic → dramatically.' },
      { number: 7, root: 'WORRY', answer: 'worryingly', accepted: [], explanation: 'A sentence adverb: “most worryingly”.' },
      { number: 8, root: 'NECESSARY', answer: 'necessity', accepted: [], explanation: 'A noun after “an absolute”: necessary → necessity.' },
    ],
  };

  sets.rue4 = {
    instructions: 'Complete the second sentence so it means the same as the first, using the key word UNCHANGED. Write 3–6 words including the key word.',
    items: [
      { number: 1, sentence1: 'I have never seen such a beautiful beach before.', keyword: 'TIME',
        sentence2: 'This is the first [[GAP]] such a beautiful beach.',
        accepted: ['time I have seen', 'time I have ever seen', 'time that I have seen'],
        explanation: '“This is the first time + present perfect” expresses a first-ever experience.' },
      { number: 2, sentence1: 'It’s a pity I didn’t learn to drive earlier.', keyword: 'WISH',
        sentence2: 'I [[GAP]] to drive earlier.',
        accepted: ['wish I had learned', 'wish I had learnt'],
        explanation: 'Regret about the past: wish + past perfect.' },
      { number: 3, sentence1: 'The concert was cancelled because the singer was ill.', keyword: 'OWING',
        sentence2: 'The concert was cancelled [[GAP]] illness.',
        accepted: ['owing to the singer’s', 'owing to the singers'],
        explanation: '“Owing to” + noun phrase replaces a because-clause.' },
      { number: 4, sentence1: '“You should have the roof repaired before winter,” the builder told us.', keyword: 'ADVISED',
        sentence2: 'The builder [[GAP]] the roof repaired before winter.',
        accepted: ['advised us to have', 'advised us to get'],
        explanation: 'Reported advice: advise + object + to-infinitive, keeping the causative “have something done”.' },
      { number: 5, sentence1: 'The company rejected his proposal outright.', keyword: 'TURNED',
        sentence2: 'His proposal [[GAP]] the company.',
        accepted: ['was turned down flat by', 'was turned down by'],
        explanation: 'Passive of the phrasal verb “turn down” (= reject).' },
      { number: 6, sentence1: 'Hardly anyone attended the exhibition’s opening night.', keyword: 'FEW',
        sentence2: 'Very [[GAP]] the exhibition’s opening night.',
        accepted: ['few people attended', 'few people came to', 'few people went to'],
        explanation: '“Hardly anyone” ≈ “very few people”.' },
    ],
  };

  sets.rue5 = {
    instructions: 'Read the text and answer questions 1–6, choosing A, B, C or D.',
    title: 'The quiet comeback of the night train',
    text: 'Twenty years ago, the sleeper train appeared to be heading for the museum. Budget airlines had made it possible to cross Europe for the price of a sandwich, and one by one the great overnight routes were cancelled. Rolling stock was sold off, staff were reassigned, and station hotels that had once buzzed at midnight fell silent. To most observers, the economics were simply unanswerable: why pay for a bed on wheels when you could fly in ninety minutes?\n\nYet the obituary turned out to be premature. Over the past few years, night trains have been returning to timetables across the continent, and not as nostalgic curiosities. New operators have entered the market with refurbished carriages, while national railways that once could not wait to abandon the business have quietly reversed course. Bookings on several relaunched routes have outstripped forecasts so consistently that extra carriages have had to be added within months.\n\nWhat changed? Part of the answer is environmental. Travellers increasingly weigh the carbon cost of their choices, and a train journey can produce a small fraction of the emissions of the equivalent flight. But it would be a mistake to see the revival as pure virtue. Passengers interviewed on the Vienna to Paris sleeper talk less about the planet than about the pleasure of the thing itself: falling asleep in one country and waking, coffee in hand, in another. The hours that a flight compresses into stress — the airport transfers, the queues, the waiting — the night train simply absorbs into sleep.\n\nThe industry’s challenges have not disappeared. Track access charges remain high, carriages are expensive to build, and a single delayed connection can unravel a timetable that stretches across three borders. Some analysts also suspect the current boom owes as much to novelty as to conviction, and that passengers may drift back to the skies once the romance wears off. The operators themselves seem unworried. As one manager put it, their best salesperson is the journey: almost nobody, she claims, takes a night train once.',
    questions: [
      { number: 1, question: 'What point does the writer make in the first paragraph?', options: { A: 'Night trains were withdrawn although they were still profitable.', B: 'Cheap flights made night trains seem economically indefensible.', C: 'Railway staff campaigned to keep the overnight routes open.', D: 'Station hotels were the first casualties of the budget airlines.' }, answer: 'B', explanation: 'The paragraph says the economics “were simply unanswerable” once budget airlines were so cheap. The hotels detail is background, not the main point.' },
      { number: 2, question: 'The word “obituary” in paragraph 2 refers to', options: { A: 'the death of a railway manager.', B: 'newspaper coverage of the new operators.', C: 'the assumption that the sleeper train was finished.', D: 'the cancellation of a particular route.' }, answer: 'C', explanation: 'The “obituary” is figurative — the widely accepted verdict that the sleeper was dying, which “turned out to be premature”.' },
      { number: 3, question: 'What does the writer suggest about demand for the relaunched routes?', options: { A: 'It has repeatedly exceeded expectations.', B: 'It is limited to nostalgic travellers.', C: 'It has forced operators to raise prices.', D: 'It depends heavily on advertising.' }, answer: 'A', explanation: '“Bookings … have outstripped forecasts so consistently that extra carriages have had to be added.”' },
      { number: 4, question: 'According to paragraph 3, passengers on the Vienna–Paris sleeper mainly value', options: { A: 'the reduced carbon emissions of rail travel.', B: 'the low cost compared with flying.', C: 'the experience of the journey itself.', D: 'the reliability of the timetable.' }, answer: 'C', explanation: 'They “talk less about the planet than about the pleasure of the thing itself”. The environmental motive is mentioned but explicitly ranked second.' },
      { number: 5, question: 'What reservation do some analysts express about the revival?', options: { A: 'Track access charges will soon rise further.', B: 'Its popularity may be a passing fashion.', C: 'Cross-border timetables are impossible to run.', D: 'New carriages are unsafe.' }, answer: 'B', explanation: 'They suspect the boom “owes as much to novelty as to conviction” and passengers “may drift back to the skies”.' },
      { number: 6, question: 'The manager’s comment at the end implies that', options: { A: 'the company does not need to advertise.', B: 'first-time passengers usually travel again.', C: 'staff are the company’s greatest asset.', D: 'most bookings are made on board.' }, answer: 'B', explanation: '“Almost nobody takes a night train once” — i.e. the experience converts first-timers into repeat customers.' },
    ],
  };

  sets.rue6 = {
    instructions: 'Read the four expert comments and answer questions 1–4 with A, B, C or D.',
    theme: 'Does remote work benefit young employees?',
    texts: [
      { id: 'A', author: 'Dana Whitfield', text: 'For employees at the start of their careers, the office is not a cage but a classroom. Watching experienced colleagues negotiate, present and even fail teaches more than any manual. Remote arrangements suit the established, but the young lose an apprenticeship they do not know they are serving. Flexibility is welcome; full-time distance is a quiet theft of opportunity.' },
      { id: 'B', author: 'Marcus Oyelaran', text: 'The claim that young people need the office to learn is mostly nostalgia. Skills are absorbed through doing meaningful work with feedback, and that can be organised online — often more deliberately than the accidental learning offices are praised for. What the young actually lack when remote is not instruction but visibility to decision-makers, and that is a promotion problem, not a learning one.' },
      { id: 'C', author: 'Priya Nandakumar', text: 'Much of this debate ignores housing. Young workers are the least likely to have a quiet room, a good chair or a fast connection, so “working from home” often means working from a shared kitchen. On learning, I side with the sceptics of remote work: the informal, overheard, unplanned exchanges of a shared workplace are precisely where junior staff pick up judgement.' },
      { id: 'D', author: 'Tomas Keller', text: 'Companies that force attendance are answering the wrong question. The evidence I have gathered shows junior staff progress fastest under hybrid patterns they help design themselves. Like others, I doubt that pure distance serves the young well, but the remedy is autonomy with anchor days, not a return to five-day presence — which mainly benefits the firms’ property departments.' },
    ],
    questions: [
      { number: 1, question: 'Which expert takes a different view from the others on whether fully remote work harms young employees’ learning?', answer: 'B', explanation: 'A, C and D all doubt that full distance serves juniors’ development; B argues learning works fine remotely and the real issue is visibility.' },
      { number: 2, question: 'Which expert shares A’s opinion about the value of unplanned workplace interaction?', answer: 'C', explanation: 'C explicitly sides with the sceptics and praises “informal, overheard, unplanned exchanges”, echoing A’s classroom argument.' },
      { number: 3, question: 'Which expert introduces a practical obstacle to remote work that the others do not discuss?', answer: 'C', explanation: 'Only C raises housing conditions — the lack of quiet space and equipment at home.' },
      { number: 4, question: 'Which expert proposes letting junior employees shape their own working pattern?', answer: 'D', explanation: 'D recommends hybrid patterns that junior staff “help design themselves”.' },
    ],
  };

  sets.rue7 = {
    instructions: 'Six paragraphs have been removed from the text. Choose the correct paragraph (A–G) for each gap. One paragraph is not needed.',
    title: 'Learning to hold my breath',
    text: 'I signed up for the freediving course on an impulse, the way people buy hats they will never wear. The advertisement promised calm, depth and “a new relationship with your own mind”, which sounded harmless enough from the safety of my sofa.\n\n[[1]]\n\nOur instructor, Marta, had other priorities. Before we were allowed anywhere near water, we spent a full morning on physiology: the reflex that slows the heart when the face is submerged, the contractions of the diaphragm that feel like an emergency but are not.\n\n[[2]]\n\nThat first attempt in the pool proved her point. I lasted barely forty seconds before surfacing in mild panic, convinced my body had been seconds from shutdown.\n\n[[3]]\n\nArmed with that reassurance, the next attempts stretched to a minute, then two. The trick, absurdly, was to stop trying: the harder I chased stillness, the faster my pulse climbed.\n\n[[4]]\n\nBy the third day we moved to open water, descending along a rope into a blue that grew darker and quieter with every metre.\n\n[[5]]\n\nMarta called that feeling “the door”, and warned us never to trust it blindly: euphoria at depth is a signal to turn back, not to push on.\n\n[[6]]\n\nI drove home with wet hair and a certificate, already planning the next course. The sea had not changed. What had changed, I suppose, was the amount of noise I brought into it.',
    paragraphs: [
      { letter: 'A', text: 'It was there, hanging at fifteen metres with the surface a pale coin above me, that the promised calm finally arrived — not as effort but as absence, as though someone had switched off a radio I had been hearing my whole life.' },
      { letter: 'B', text: 'Marta ended the course with exactly that caution. Freediving, she said, is not a battle against the body but a negotiation with it, and negotiations fail when one side stops listening.' },
      { letter: 'C', text: 'What I had imagined, of course, was the glamorous part: gliding past coral in a single breath, half dolphin, half monk. I had given no thought at all to the training that might come first.' },
      { letter: 'D', text: 'She then dismantled my panic with one sentence: the urge to breathe, she explained, is triggered by rising carbon dioxide, not by any real shortage of oxygen, and a healthy body has far deeper reserves than the mind believes.' },
      { letter: 'E', text: 'Equipment, by contrast, was barely mentioned that morning. Fins, masks and wetsuits, Marta said, could be sorted out in five minutes at the dive shop.' },
      { letter: 'F', text: 'Only when we could recite these signals back to her did she let us get wet, and even then the first exercise was simply floating face down, doing nothing at all.' },
      { letter: 'G', text: 'Watching the others manage the same exercise no better was oddly comforting; whatever was defeating us, it was clearly not a private weakness.' },
    ],
    answers: [
      { number: 1, letter: 'C', explanation: '“What I had imagined” picks up the sofa daydream, and “the training that might come first” sets up “Marta had other priorities”.' },
      { number: 2, letter: 'F', explanation: '“These signals” refers back to the physiology morning, and the floating exercise leads into “That first attempt in the pool”.' },
      { number: 3, letter: 'D', explanation: '“She then dismantled my panic” answers the panic of the forty-second attempt, and “that reassurance” in the next paragraph refers to her sentence.' },
      { number: 4, letter: 'G', explanation: 'Watching the others fail the same exercise fits between the early struggles and the move to open water; “the same exercise” is the cohesion clue.' },
      { number: 5, letter: 'A', explanation: '“It was there, hanging at fifteen metres” refers directly to the descent along the rope, and the arriving calm is “that feeling” Marta names next.' },
      { number: 6, letter: 'B', explanation: '“Exactly that caution” echoes the warning never to trust euphoria, rounding the course off before the drive home.' },
    ],
    distractor: 'E',
  };

  sets.rue8 = {
    instructions: 'Answer questions 1–10 by choosing the section (A–D) in which each thing is mentioned.',
    title: 'Four people describe changing careers',
    sections: [
      { id: 'A', title: 'Ines — lawyer to baker', text: 'People assume I burnt out, but the truth is duller: I was good at law and bored by it. The bakery began as weekend therapy and became a business almost by accident when a café ordered forty loaves a week. My income halved, which I had planned for; what I had not planned for was how physical the work is. My old colleagues envy me at parties, then go back to jobs I know they will never leave.' },
      { id: 'B', title: 'Karl — soldier to primary teacher', text: 'The army taught me calm, and a classroom of eight-year-olds spends it fast. I retrained in my forties, the oldest student on my course by a decade, and I minded that far more than I expected. The pay cut was real but manageable. What nobody warned me about was the paperwork — I plan lessons at ten at night. Even so, the first time a struggling reader finished a book, I knew the uniform had been the wrong fit all along.' },
      { id: 'C', title: 'Amaia — accountant to marine guide', text: 'Everyone said I was brave, which is another word for reckless when it goes wrong. It nearly did: my first season the company folded and I worked unpaid for a month. I stayed because the sea in the morning is a salary of its own. I retrained gradually, doing my qualifications by correspondence while still auditing spreadsheets, which I would recommend to anyone over a dramatic exit. My family still asks when I will get a real job.' },
      { id: 'D', title: 'Ben — chef to software developer', text: 'Kitchens run on adrenaline and shouting, and I loved them until my knees did not. Coding I learned at night, free courses first, then a bootcamp that cost a terrifying amount and repaid itself within a year. The money is better, which nobody believes of a career change. What I miss is the instant verdict of service — code compliments you slowly, if at all. My advice: change before you must, not after.' },
    ],
    questions: [
      { number: 1, question: 'In which section does the writer mention keeping their old job while retraining?', answer: 'C', explanation: 'Amaia did her qualifications by correspondence “while still auditing spreadsheets”.' },
      { number: 2, question: 'In which section does the writer say their earnings increased after the change?', answer: 'D', explanation: 'Ben notes “the money is better, which nobody believes of a career change”.' },
      { number: 3, question: 'In which section is an unexpected physical demand of the new work mentioned?', answer: 'A', explanation: 'Ines “had not planned for how physical the work is”.' },
      { number: 4, question: 'In which section does the writer describe feeling self-conscious about their age?', answer: 'B', explanation: 'Karl was “the oldest student on my course by a decade, and I minded that far more than I expected”.' },
      { number: 5, question: 'In which section does the writer mention working without pay?', answer: 'C', explanation: 'Amaia “worked unpaid for a month” when the company folded.' },
      { number: 6, question: 'In which section is an unforeseen administrative burden described?', answer: 'B', explanation: 'Karl says nobody warned him about the paperwork.' },
      { number: 7, question: 'In which section does the writer say a health problem prompted the change?', answer: 'D', explanation: 'Ben loved kitchens “until my knees did not”.' },
      { number: 8, question: 'In which section does the writer suggest others secretly wish they could do the same?', answer: 'A', explanation: 'Her old colleagues “envy me at parties, then go back to jobs I know they will never leave”.' },
      { number: 9, question: 'In which section is a single moment of professional reward described?', answer: 'B', explanation: 'The first time a struggling reader finished a book.' },
      { number: 10, question: 'In which section does the writer recommend a gradual transition rather than a sudden one?', answer: 'C', explanation: 'Amaia recommends retraining gradually “to anyone over a dramatic exit”.' },
    ],
  };

  sets.lis1 = {
    instructions: 'You will hear three short extracts. For questions 1–6, choose the best answer (A, B or C).',
    extracts: [
      {
        id: 1,
        situation: 'You hear two friends discussing a photography exhibition.',
        script: [
          { speaker: 'Woman', text: 'So, was the exhibition worth the queue? You were quite sniffy about the last one.' },
          { speaker: 'Man', text: 'I was, and I went in expecting more of the same, to be honest. But this one caught me off guard. The early landscapes I could take or leave — technically clever, but cold. It was the portraits at the end that did it. I stood in front of one for ten minutes.' },
          { speaker: 'Woman', text: 'Ten minutes! The man who says galleries are for people with too much lunch break.' },
          { speaker: 'Man', text: 'Yes, well. I’d still say the ticket price is steep, and the lighting in the first room is frankly terrible. But I’d go again, which is not something you’ll hear me say often.' },
        ],
        questions: [
          { number: 1, question: 'How does the man feel about the exhibition now?', options: { A: 'won over despite his expectations', B: 'disappointed by the portraits', C: 'convinced the price was fair' }, answer: 'A', explanation: 'He “went in expecting more of the same” but was “caught off guard” and would go again. He still criticises the price, so C is wrong.' },
          { number: 2, question: 'What do the speakers agree about?', options: { A: 'The man rarely praises galleries.', B: 'The landscapes were the highlight.', C: 'The queue was too long.' }, answer: 'A', explanation: 'She teases him about never lingering in galleries and he concedes “not something you’ll hear me say often”.' },
        ],
      },
      {
        id: 2,
        situation: 'You hear a manager talking to a colleague about an office move.',
        script: [
          { speaker: 'Man', text: 'Have you seen the plans for the new building? Everyone gets a locker instead of a desk. A locker! Like school.' },
          { speaker: 'Woman', text: 'I had the same reaction, honestly. But I visited the pilot floor on Tuesday, and it’s not what I pictured. There are quiet rooms, proper ones, and you can actually book them. I got more done in two hours there than in a day at my desk.' },
          { speaker: 'Man', text: 'You sound like the brochure.' },
          { speaker: 'Woman', text: 'I know how I sound. Look, I’m not saying the reasons behind it aren’t about saving money — of course they are. I’m saying the result might suit us anyway. Try the fourth floor before you sign the petition.' },
        ],
        questions: [
          { number: 3, question: 'What is the woman’s attitude to the office move?', options: { A: 'She changed her mind after seeing it in practice.', B: 'She believes the company’s motives are generous.', C: 'She thinks the quiet rooms will be removed.' }, answer: 'A', explanation: 'She “had the same reaction” at first but was persuaded by the pilot floor. She explicitly says the motives ARE about saving money, so B is wrong.' },
          { number: 4, question: 'What does she encourage the man to do?', options: { A: 'organise a petition', B: 'judge the change after trying it', C: 'book a quiet room for her' }, answer: 'B', explanation: '“Try the fourth floor before you sign the petition.”' },
        ],
      },
      {
        id: 3,
        situation: 'You hear part of a radio interview with a marathon runner.',
        script: [
          { speaker: 'Interviewer', text: 'Third marathon this year — most people would call that obsessive.' },
          { speaker: 'Woman', text: 'They do call it that, usually to my face! But here’s the thing: I’m slower than I was five years ago and I couldn’t care less. I used to be a slave to my watch — every split, every heartbeat. One injury cured me of all that. Now the training run is the point, not the rehearsal for something else.' },
          { speaker: 'Interviewer', text: 'No time goals at all on Sunday?' },
          { speaker: 'Woman', text: 'My only goal is to be smiling at mile twenty. If you see me scowling, you have my permission to hand me a bus ticket.' },
        ],
        questions: [
          { number: 5, question: 'What changed the runner’s attitude to training?', options: { A: 'getting injured', B: 'buying a new watch', C: 'running more slowly' }, answer: 'A', explanation: '“One injury cured me of all that.” The slowness is a consequence she accepts, not the cause.' },
          { number: 6, question: 'What is her aim for the race?', options: { A: 'to beat her previous time', B: 'to enjoy it throughout', C: 'to finish without walking' }, answer: 'B', explanation: 'Her “only goal is to be smiling at mile twenty” — enjoyment, not time.' },
        ],
      },
    ],
  };

  sets.lis2 = {
    instructions: 'You will hear a talk. For questions 1–8, complete the sentences with a word or short phrase.',
    situation: 'You hear a museum conservator called Elena Marsh giving a talk about her work.',
    script: [
      { speaker: 'Elena Marsh', text: 'People imagine museum conservation is all about paintings, but I actually started my career as a bookbinder, repairing damaged atlases for a university library. It was only later that I retrained to work with textiles, which is what I do now. My current project is a ship’s flag from the eighteenth century. When it arrived, most colleagues assumed the biggest threat to it would be moths, but in fact the real enemy turned out to be salt, crystallised deep in the fibres from decades at sea.' },
      { speaker: 'Elena Marsh', text: 'Removing it is slow. We don’t use chemicals where we can avoid them; the safest tool, believe it or not, is distilled water, applied drop by drop over many weeks. People are surprised that patience matters more than technology in this job. My rule for trainees is simple: if a treatment can’t be undone, we don’t do it. Conservators call this principle reversibility, and it governs everything in the studio.' },
      { speaker: 'Elena Marsh', text: 'The strangest object I’ve ever treated? A wedding dress made entirely of parachute silk, sewn in 1946 when fabric was still rationed. The bride’s granddaughter brought it in, and when we finished, she didn’t put it in a frame — she wore it at her own wedding, which for me is the whole point. These things aren’t relics; they’re still alive. Next year the flag goes back on display, and my name won’t appear anywhere near it. Good conservation, as my first teacher liked to say, is invisible.' },
    ],
    questions: [
      { number: 1, sentence: 'Elena began her career working as a [[GAP]].', answer: 'bookbinder', accepted: [], explanation: 'She says she “started my career as a bookbinder”.' },
      { number: 2, sentence: 'She repaired damaged [[GAP]] for a university library.', answer: 'atlases', accepted: [], explanation: 'Stated directly: “repairing damaged atlases”.' },
      { number: 3, sentence: 'Colleagues expected the flag’s main enemy to be [[GAP]].', answer: 'moths', accepted: [], explanation: 'The expectation was moths; the real threat was salt — classic distraction.' },
      { number: 4, sentence: 'The real damage to the flag was caused by [[GAP]] in the fibres.', answer: 'salt', accepted: ['crystallised salt'], explanation: '“The real enemy turned out to be salt.”' },
      { number: 5, sentence: 'The safest cleaning tool she mentions is [[GAP]].', answer: 'distilled water', accepted: ['water'], explanation: 'Applied “drop by drop over many weeks”.' },
      { number: 6, sentence: 'The studio principle that treatments must be undoable is called [[GAP]].', answer: 'reversibility', accepted: [], explanation: 'She names the principle explicitly.' },
      { number: 7, sentence: 'The unusual wedding dress was made from [[GAP]].', answer: 'parachute silk', accepted: ['silk'], explanation: '“A wedding dress made entirely of parachute silk.”' },
      { number: 8, sentence: 'According to Elena’s first teacher, good conservation is [[GAP]].', answer: 'invisible', accepted: [], explanation: 'The closing quotation: “Good conservation is invisible.”' },
    ],
  };

  sets.lis3 = {
    instructions: 'You will hear an interview. For questions 1–6, choose the best answer (A, B, C or D).',
    situation: 'You hear an interview with Dr Sam Reyes, a researcher who studies city noise.',
    script: [
      { speaker: 'Interviewer', text: 'Sam, you spent a year measuring noise in six cities. Most of us would say we already know cities are loud. What did the data add?' },
      { speaker: 'Dr Reyes', text: 'Mostly, it corrected me. I went in assuming traffic would dominate everywhere, and in four cities it did. But in two, the loudest regular sound at street level was actually construction — and unlike traffic, it’s concentrated in exactly the neighbourhoods that are cheapest to live in. That pattern bothered me far more than the overall volume.' },
      { speaker: 'Interviewer', text: 'So noise is an inequality issue.' },
      { speaker: 'Dr Reyes', text: 'It is, and that’s the part that rarely makes the headlines. Everyone writes about decibels; almost nobody writes about who absorbs them. A hospital gets a quiet zone, and rightly so. A block of rented flats next to a demolition site gets ear plugs, if that.' },
      { speaker: 'Interviewer', text: 'Your critics say the solution — stricter limits — would choke housebuilding just when cities need it.' },
      { speaker: 'Dr Reyes', text: 'And if we proposed banning construction, they’d be right. What we actually propose is scheduling: the same work, arranged around people rather than machines. In our pilot, moving the loudest phases to mid-morning cut complaints by half without adding a single day to the project. The builders were sceptical at first; by the end, the site manager was our loudest supporter — no pun intended.' },
      { speaker: 'Interviewer', text: 'And personally? A year of listening to noise…' },
      { speaker: 'Dr Reyes', text: 'People expect me to say I crave silence. The truth is stranger: I’ve stopped hearing noise as one thing. A market at full voice is loud and I love it. It’s the involuntary sounds — the ones you can’t predict or escape — that wear people down. If our work changes one word in city policy, I’d want it to be that one: from “quieter” to “fairer”.' },
    ],
    questions: [
      { number: 1, question: 'What surprised Dr Reyes most in the data?', options: { A: 'Cities were louder than expected overall.', B: 'Construction noise was concentrated in poorer areas.', C: 'Traffic was the main source in every city.', D: 'Hospitals were among the noisiest places.' }, answer: 'B', explanation: 'Traffic dominated in only four of six cities; what “bothered” him was construction clustering where housing is cheapest.' },
      { number: 2, question: 'What does Dr Reyes think news coverage of noise lacks?', options: { A: 'accurate decibel measurements', B: 'attention to who suffers the noise', C: 'interviews with hospital staff', D: 'criticism of city councils' }, answer: 'B', explanation: '“Everyone writes about decibels; almost nobody writes about who absorbs them.”' },
      { number: 3, question: 'How does he respond to his critics?', options: { A: 'He accepts stricter limits would harm housebuilding.', B: 'He denies that cities need more housing.', C: 'He says his proposal reorganises work rather than restricting it.', D: 'He argues builders should pay compensation.' }, answer: 'C', explanation: 'The proposal is scheduling — “the same work, arranged around people” — not limits or bans.' },
      { number: 4, question: 'What happened in the pilot project?', options: { A: 'Complaints halved with no delay to the work.', B: 'The project finished earlier than planned.', C: 'The loudest work was moved to the evening.', D: 'Residents were given ear protection.' }, answer: 'A', explanation: '“Cut complaints by half without adding a single day.” The loud phases moved to mid-morning, not evening.' },
      { number: 5, question: 'How did the site manager’s attitude change?', options: { A: 'from supportive to hostile', B: 'from sceptical to enthusiastic', C: 'from enthusiastic to indifferent', D: 'from hostile to resigned' }, answer: 'B', explanation: '“Sceptical at first; by the end … our loudest supporter.”' },
      { number: 6, question: 'What conclusion has Dr Reyes reached about noise?', options: { A: 'All loud sounds harm health equally.', B: 'Silence should be the goal of city policy.', C: 'Predictability matters more than volume.', D: 'Markets should be moved out of city centres.' }, answer: 'C', explanation: 'He loves a loud market; it is “the involuntary sounds — the ones you can’t predict or escape — that wear people down”.' },
    ],
  };

  sets.lis4 = {
    instructions: 'You will hear five short extracts in which people talk about moving to another country. Complete both tasks (questions 21–30).',
    theme: 'Moving abroad',
    extracts: [
      { id: 1, speakerLabel: 'Speaker 1', text: 'The job offer came on a Tuesday and I said yes before checking where the city actually was. Everyone calls that brave; I call it not thinking. Five years on, my worst moments are still the video calls home — my niece grows a year between visits. But professionally? I’d sign again tomorrow.' },
      { id: 2, speakerLabel: 'Speaker 2', text: 'We moved for my partner’s work, which nobody tells you is its own strange grief — your days need rebuilding from zero while theirs arrive ready-made. The language classes saved me, honestly. Not for the grammar: for the room of people as lost as I was. Two of them are still my closest friends here.' },
      { id: 3, speakerLabel: 'Speaker 3', text: 'I went for a year to save money, that was the whole plan — nurses earn double there. The spreadsheet worked, the plan didn’t: I met someone, and the return ticket quietly expired. My mother has forgiven the country now. Mostly. She visits every summer and complains about the bread, which is how she says she loves me.' },
      { id: 4, speakerLabel: 'Speaker 4', text: 'Honestly? I moved because my hometown had decided who I was by the time I was sixteen, and I wanted a vote. Abroad, nobody knew my family or my school or my one disastrous year. The anonymity terrified me for a month and then it felt like oxygen. I built myself deliberately, choice by choice.' },
      { id: 5, speakerLabel: 'Speaker 5', text: 'Retiring abroad was my wife’s dream, and I went along with the enthusiasm of a man carrying furniture. I gave the sunshine six months. What actually got me was the market — I started helping on a fruit stall for the language practice, and now they save me the early shift. My old colleagues think I’ve lost my mind. I’ve never been so hard to reach, or so easy to please.' },
    ],
    task1: {
      heading: 'For questions 21–25, choose from the list (A–H) each speaker’s reason for moving abroad.',
      options: {
        A: 'to escape a fixed identity', B: 'to accept a sudden job offer', C: 'to follow a partner',
        D: 'to earn more money', E: 'to study a language', F: 'to fulfil a shared retirement plan',
        G: 'to recover from an illness', H: 'to be closer to family',
      },
      questions: [
        { number: 21, speaker: 1, answer: 'B', explanation: 'The job offer came “on a Tuesday and I said yes”.' },
        { number: 22, speaker: 2, answer: 'C', explanation: '“We moved for my partner’s work.”' },
        { number: 23, speaker: 3, answer: 'D', explanation: 'The plan was “to save money — nurses earn double there”.' },
        { number: 24, speaker: 4, answer: 'A', explanation: 'The hometown “had decided who I was”; moving gave a fresh identity.' },
        { number: 25, speaker: 5, answer: 'F', explanation: 'Retiring abroad was his wife’s dream that he went along with.' },
      ],
    },
    task2: {
      heading: 'For questions 26–30, choose from the list (A–H) what each speaker says about their life now.',
      options: {
        A: 'An unplanned relationship changed everything.', B: 'Distance from relatives remains painful.',
        C: 'A class provided lasting friendships.', D: 'An unexpected pastime became central.',
        E: 'Money worries have returned.', F: 'Anonymity became liberating.',
        G: 'They plan to move back soon.', H: 'Their health has improved.',
      },
      questions: [
        { number: 26, speaker: 1, answer: 'B', explanation: 'The “worst moments are still the video calls home”.' },
        { number: 27, speaker: 2, answer: 'C', explanation: 'Two people from the language class “are still my closest friends”.' },
        { number: 28, speaker: 3, answer: 'A', explanation: '“I met someone, and the return ticket quietly expired.”' },
        { number: 29, speaker: 4, answer: 'F', explanation: 'The anonymity “terrified me for a month and then it felt like oxygen”.' },
        { number: 30, speaker: 5, answer: 'D', explanation: 'Helping on the fruit stall — begun for language practice — is now his routine.' },
      ],
    },
  };

  sets.wri1 = {
    instructions: 'Write your essay in 220–260 words in an appropriate style.',
    taskType: 'essay',
    title: 'Essay: attracting visitors to museums',
    scenario: 'Your class has attended a panel discussion on what museums should do to attract more young visitors. You have made the notes below.',
    prompt: 'Which two of the following should museums prioritise to attract younger visitors — and why? Write an essay discussing TWO of the points below. You should explain which measure is more important, giving reasons in support of your answer.',
    bullets: ['making entry free for under-25s', 'using interactive technology in exhibitions'],
    notes: 'You may also introduce a third measure of your own (e.g. late-night openings, social media). Give reasons for your point of view.',
    targetWords: { min: 220, max: 260 },
  };

  sets.wri2 = {
    instructions: 'Write your answer in 220–260 words in an appropriate style.',
    taskType: 'review',
    title: 'Review: an app that changed your habits',
    scenario: 'An English-language lifestyle website has invited readers to review a mobile app that genuinely changed one of their everyday habits.',
    prompt: 'Write a review describing the app and what it does, explaining how it changed one of your habits, and assessing who would — and would not — benefit from it. Reviews should inform and entertain, and end with a clear recommendation.',
    notes: 'Target reader: general public on a lifestyle website. Register: semi-formal, lively.',
    targetWords: { min: 220, max: 260 },
  };

  const assessment = {
    bands: { content: 3, communicativeAchievement: 3, organisation: 4, language: 3 },
    estimatedScale: 183,
    overallComment: 'A solid borderline-pass essay. You address both chosen points and your paragraphing is genuinely good — each paragraph has one job and does it. To push beyond 180, tighten the register (a few phrases are chatty for an essay) and cut repetition of "important", which appears six times. Your conclusion states a clear opinion, which many candidates forget.',
    strengths: [
      'Clear four-paragraph structure with topic sentences',
      'A definite, justified opinion in the conclusion',
      'Good range of linkers (nevertheless, what is more, in the long run)',
    ],
    corrections: [
      { original: 'museums must adapt themselves for not being forgotten', improved: 'museums must adapt if they are not to be forgotten', note: '"adapt" is not reflexive here, and the purpose clause needs "if … are not to".' },
      { original: 'the most part of young people', improved: 'the majority of young people', note: 'False friend: "the most part" is not a natural English quantifier.' },
      { original: 'it exists many reasons to visit', improved: 'there are many reasons to visit', note: 'Existential "there are", not "it exists".' },
      { original: 'a very important important point', improved: 'a crucial point', note: 'Accidental repetition — and "crucial" adds lexical range.' },
    ],
    modelAnswer: 'It is often claimed that museums are losing the battle for young people’s attention. Having discussed the issue in class, I believe the two most promising measures are free entry for under-25s and interactive technology, although only one of them deserves priority.\n\nFree admission removes the most obvious barrier. Students and young workers weigh every expense, and a ticket price turns a spontaneous visit into a calculated one. Cities that have scrapped fees for young visitors report immediate rises in attendance, which suggests the demand exists and is merely being priced out.\n\nInteractive technology, by contrast, addresses motivation rather than cost. Screens and simulations can transform a passive display into an experience visitors help to create, and this is the language younger audiences already speak. Nevertheless, technology dates quickly, is expensive to maintain, and can distract from the very objects it is meant to illuminate.\n\nFor these reasons, I would prioritise free entry. A museum that is affordable will be visited even if it is old-fashioned, whereas an interactive museum that charges remains, for many young people, a closed door. In the long run, the habit of visiting — formed cheaply at twenty — is exactly what fills galleries at forty. Technology can wait; the open door cannot.',
  };

  const speaking = {
    1: { part: 1, prompts: [
      'Is there a skill you gave up learning that you would like to return to? Why did you stop?',
      'What kind of place would you most like to live in ten years from now, and why?',
      'Do you prefer planning your free time in advance or deciding spontaneously? Why?',
      'What piece of technology could you most easily live without? Explain your choice.',
    ] },
    2: { part: 2, prompts: [
      'Imagine three situations: people queuing overnight for concert tickets; people shopping in a crowded market; people waiting in an airport departure lounge. Compare TWO of them, and say why the people might have chosen to be there and how they might be feeling.',
      'Imagine three scenes: a student studying alone in a library; colleagues brainstorming around a whiteboard; a person attending an online class in their kitchen. Compare TWO of them, and say what the people might find difficult and how effective each way of learning might be.',
      'Imagine three moments: a family cooking together on a holiday; friends eating street food while travelling; a formal dinner at a restaurant. Compare TWO of them, and say why the meals might be memorable and what the people might talk about.',
    ] },
    3: { part: 3, prompts: [
      'Task: "How can towns encourage people to use cars less?" Prompts to discuss: better cycle lanes · cheaper public transport · car-free city centres · working from home · higher parking charges. Then decide: which measure would make the biggest difference most quickly?',
      'Task: "What makes people stay in a job for a long time?" Prompts to discuss: salary · friendly colleagues · chances of promotion · feeling the work matters · flexible hours. Then decide: which factor matters most to people under thirty?',
      'Task: "How can schools better prepare students for adult life?" Prompts to discuss: managing money · cooking and nutrition · dealing with failure · speaking in public · understanding the news. Then decide: which skill should be taught first?',
    ] },
    4: { part: 4, prompts: [
      'Some people say that progress always creates as many problems as it solves. Do you agree?',
      'Is it better for young people to have many short work experiences or one long, stable one? Why?',
      'Do you think cities of the future will be better or worse places to live than cities today?',
      'Some people believe failure teaches more than success. What do you think?',
    ] },
  };

  const vocabWords = [
    { word: 'ubiquitous', pos: 'adjective', definition: 'seeming to be everywhere at the same time', example: 'Smartphones have become so ubiquitous that cafés design their tables around them.', synonyms: ['omnipresent', 'pervasive'], collocations: ['ubiquitous presence', 'increasingly ubiquitous'] },
    { word: 'to mitigate', pos: 'verb', definition: 'to make something less severe, harmful or serious', example: 'Urban trees help mitigate the effects of summer heatwaves.', synonyms: ['alleviate', 'lessen', 'soften'], collocations: ['mitigate the risk', 'mitigate the impact'] },
    { word: 'a foregone conclusion', pos: 'idiom', definition: 'a result so predictable that it is certain before it happens', example: 'Her promotion was a foregone conclusion after the project’s success.', synonyms: ['certainty', 'inevitability'], collocations: ['seem a foregone conclusion'] },
    { word: 'to gloss over', pos: 'phrasal verb', definition: 'to deliberately avoid discussing something unpleasant in detail', example: 'The report glosses over the project’s early failures.', synonyms: ['downplay', 'brush aside'], collocations: ['gloss over the details'] },
    { word: 'compelling', pos: 'adjective', definition: 'so interesting or convincing that it demands attention or agreement', example: 'She made a compelling case for reforming the timetable.', synonyms: ['persuasive', 'gripping'], collocations: ['compelling argument', 'compelling evidence'] },
    { word: 'to underpin', pos: 'verb', definition: 'to form the basis or support of an idea or system', example: 'Trust underpins every successful team.', synonyms: ['support', 'sustain'], collocations: ['underpin the economy', 'underpinned by research'] },
    { word: 'notwithstanding', pos: 'preposition / adverb', definition: 'despite; in spite of (formal)', example: 'Notwithstanding the criticism, the plan went ahead unchanged.', synonyms: ['despite', 'nevertheless'], collocations: ['notwithstanding the fact that'] },
    { word: 'a stopgap', pos: 'noun', definition: 'a temporary solution used until something better is found', example: 'Renting equipment was only ever a stopgap until the new lab opened.', synonyms: ['makeshift', 'interim measure'], collocations: ['a stopgap measure', 'serve as a stopgap'] },
    { word: 'elusive', pos: 'adjective', definition: 'difficult to find, catch, define or achieve', example: 'A good night’s sleep proved elusive during the exams.', synonyms: ['hard to pin down', 'evasive'], collocations: ['an elusive goal', 'remain elusive'] },
    { word: 'to scupper', pos: 'verb', definition: 'to ruin a plan or prevent it from succeeding (informal, BrE)', example: 'The strike scuppered our travel plans entirely.', synonyms: ['wreck', 'derail', 'thwart'], collocations: ['scupper the deal', 'scupper any chance of'] },
  ];

  const clone = (v) => JSON.parse(JSON.stringify(v));

  CAE.mock = {
    sets,
    assessment,
    speaking,
    getSet(partId) {
      if (!sets[partId]) throw new Error('No mock set for ' + partId);
      return clone(sets[partId]);
    },
    getAssessment() { return clone(assessment); },
    getSpeaking(part) {
      const p = speaking[Number(part)] || speaking[1];
      return clone(p);
    },
    getVocabWords(count, word) {
      if (word) {
        return { words: [{
          word: String(word), pos: 'noun',
          definition: 'demo definition — connect an AI engine for a real one',
          example: 'This is a sample sentence using “' + String(word) + '”.',
          synonyms: ['sample'], collocations: [],
        }] };
      }
      const n = Math.min(Number(count) || 10, vocabWords.length);
      return { words: clone(vocabWords).slice(0, n) };
    },
  };
})();
