// Curriculum: Class X Physical Science (NCERT). Aims follow the existing Smart Science Lab site.
export const teacher = 'V.V. Ramana Murthy, M.Sc, B.Ed.';
export const school = 'ZPHS, Gurajanapalli';
/** Shown at the top of every page: the teacher first, then the school. */
export const credit = `${teacher} · ${school}`;

export const lessons = [
  {
    no: 1, slug: 'lesson1', title: 'Chemical Reactions and Equations', subject: 'chemistry', color: '#f97316', icon: 'flask',
    blurb: 'Watch gases bubble, solids appear and colours change as substances react.',
    experiments: [
      { id: 'zinc-hcl', activity: 'Activity 1.3', title: 'Zinc + dilute acid', short: 'Watch hydrogen bubble up and hear it pop.',
        aim: 'To see what happens when zinc reacts with dilute hydrochloric acid.',
        materials: ['Zinc granules', 'Dilute HCl', 'Test tube', 'Thermometer', 'Splinter', 'Matchbox'],
        safety: 'Handle acid with care. Wear goggles and do this only with your teacher.' },
      { id: 'lead-iodide', activity: 'Activity 1.2', title: 'Lead nitrate + potassium iodide', short: 'Two clear solutions make a bright yellow solid.',
        aim: 'To observe the reaction between lead nitrate and potassium iodide solutions.',
        materials: ['Lead nitrate solution', 'Potassium iodide solution', 'Test tubes', 'Test tube stand'],
        safety: 'Lead compounds are poisonous. Never touch or taste them; wash hands after use.' },
      { id: 'heat-lead-nitrate', activity: 'Activity 1.6', title: 'Heating lead nitrate', short: 'Heat a white powder and watch brown fumes rise.',
        aim: 'To observe what happens when lead nitrate is heated.',
        materials: ['Lead nitrate powder', 'Boiling tube', 'Test tube holder', 'Burner'],
        safety: 'Brown NO₂ fumes are toxic. Heat in a fume cupboard and keep your face away.' },
    ],
  },
  {
    no: 2, slug: 'lesson2', title: 'Acids, Bases and Salts', subject: 'chemistry', color: '#0ea5e9', icon: 'drop',
    blurb: 'Discover the hidden water inside blue salt crystals.',
    experiments: [
      { id: 'copper-sulphate', activity: 'Activity 2.15', title: 'Are the crystals of salts really dry?', short: 'Heat blue crystals and see them turn white.',
        aim: 'To show that copper sulphate crystals contain water of crystallisation, which is lost on heating.',
        materials: ['Copper sulphate crystals', 'Boiling tube', 'Test tube holder', 'Burner', 'Dropper with water'],
        safety: 'The tube gets very hot. Hold it with a holder and point the mouth away from people.' },
    ],
  },
  {
    no: 3, slug: 'lesson3', title: 'Metals and Non-metals', subject: 'chemistry', color: '#a16207', icon: 'nail',
    blurb: 'Rust iron nails and watch a more reactive metal push out a less reactive one.',
    experiments: [
      { id: 'rusting', activity: 'Activity 3.14', title: 'Rusting of iron', short: 'Three tubes, three conditions — which nail rusts?',
        aim: 'To show that both air and water are needed for iron to rust.',
        materials: ['Iron nails', 'Three test tubes', 'Boiled distilled water', 'Oil', 'Anhydrous calcium chloride', 'Corks'],
        safety: 'Handle the nails carefully; calcium chloride irritates skin.' },
      { id: 'nail-copper-sulphate', activity: 'Activity 3.12', title: 'Nail in copper sulphate', short: 'Iron turns brown and the blue colour fades.',
        aim: 'To find out how metals react with solutions of other metal salts.',
        materials: ['Clean iron nail', 'Copper sulphate solution', 'Test tube', 'Thread', 'Sandpaper'],
        safety: 'Copper sulphate is harmful if swallowed. Wash hands afterwards.' },
    ],
  },
  {
    no: 4, slug: 'lesson4', title: 'Carbon and its Compounds', subject: 'chemistry', color: '#16a34a', icon: 'hex',
    blurb: 'Make soap micelles, a fruity ester, and fizz carbon dioxide into lime water.',
    experiments: [
      { id: 'soap-micelles', activity: 'Activity 4.12', title: 'Cleaning action of soap', short: 'Zoom into the water and see micelles trap oil.',
        aim: 'To study the cleaning action of soap and the formation of micelles.',
        materials: ['Two test tubes', 'Water', 'Cooking oil', 'Soap solution'],
        safety: 'Do not get soap solution in your eyes.' },
      { id: 'ethanol-oxidation', activity: 'Activity 4.6', title: 'Oxidation of ethanol', short: 'Purple permanganate loses its colour in warm ethanol.',
        aim: 'To study the oxidation of ethanol by alkaline potassium permanganate.',
        materials: ['Ethanol', '5% alkaline KMnO₄', 'Test tube', 'Water bath', 'Dropper'],
        safety: 'Ethanol is flammable — warm it only in a water bath, never over a flame.' },
      { id: 'esterification', activity: 'Activity 4.7', title: 'Making an ester', short: 'Warm an acid and an alcohol to make a sweet smell.',
        aim: 'To prepare an ester from ethanol and ethanoic acid.',
        materials: ['Absolute ethanol', 'Glacial ethanoic acid', 'Conc. H₂SO₄ (few drops)', 'Test tube', 'Water bath', 'Beaker of water'],
        safety: 'Concentrated sulphuric acid is corrosive. Only your teacher should add it.' },
      { id: 'ethanoic-carbonate', activity: 'Activity 4.8', title: 'Ethanoic acid + carbonates', short: 'Fizz CO₂ into lime water and turn it milky.',
        aim: 'To study the reaction of ethanoic acid with carbonates and hydrogencarbonates.',
        materials: ['Sodium carbonate', 'Sodium hydrogencarbonate', 'Ethanoic acid', 'Test tubes', 'Delivery tube', 'Lime water'],
        safety: 'Ethanoic acid has a strong smell and irritates eyes.' },
    ],
  },
  {
    no: 9, slug: 'lesson9', title: 'Light – Reflection and Refraction', subject: 'physics', color: '#eab308', icon: 'beam',
    blurb: 'Find real images with mirrors and lenses on an optical bench, and bend light through glass.',
    experiments: [
      { id: 'concave-mirror', activity: 'Activity 9.2', title: 'Concave mirror images', short: 'Move a candle along the bench and catch its image on a screen.',
        aim: 'To study the images formed by a concave mirror for different positions of the object.',
        materials: ['Concave mirror (f = 15 cm)', 'Mirror holder', 'Candle', 'White screen', 'Optical bench (metre scale)'],
        safety: 'Keep hair and paper away from the candle flame.' },
      { id: 'convex-lens', activity: 'Activity 9.8', title: 'Convex lens images', short: 'Slide the candle and screen to focus a sharp image.',
        aim: 'To study the images formed by a convex lens for different positions of the object.',
        materials: ['Convex lens (f = 15 cm)', 'Lens holder', 'Candle', 'White screen', 'Optical bench'],
        safety: 'Never look at the Sun through a lens.' },
      { id: 'glass-slab', activity: 'Activity 9.7', title: 'Refraction through a glass slab', short: 'Trace a ray with pins and measure the lateral shift.',
        aim: 'To trace the path of a ray of light through a rectangular glass slab.',
        materials: ['Rectangular glass slab', 'Drawing board', 'White paper', 'Pins', 'Protractor', 'Scale'],
        safety: 'Handle pins carefully.' },
    ],
  },
  {
    no: 10, slug: 'lesson10', title: 'The Human Eye and the Colourful World', subject: 'physics', color: '#8b5cf6', icon: 'eye',
    blurb: 'Split white light into a rainbow, fix blurry eyes with lenses and find out why the sky is blue.',
    experiments: [
      { id: 'prism-deviation', activity: 'Activity 10.1', title: 'Refraction through a prism', short: 'Trace a ray through a prism and measure the angle of deviation.',
        aim: 'To trace the path of a ray of light through a glass prism and find the angle of deviation.',
        materials: ['Glass prism', 'Drawing board', 'White paper', 'Pins', 'Protractor'],
        safety: 'Handle pins carefully.' },
      { id: 'dispersion', activity: 'Activity 10.2', title: 'Dispersion of white light', short: 'Split sunlight into VIBGYOR — then join it back.',
        aim: 'To study the dispersion of white light by a glass prism and the recombination of the spectrum.',
        materials: ['Two glass prisms', 'Cardboard with a narrow slit', 'White screen', 'Light source'],
        safety: 'Never look directly at the Sun.' },
      { id: 'eye-defects', activity: 'Activity 10.x', title: 'Correcting eye defects', short: 'Choose the lens that makes a blurry eye see clearly.',
        aim: 'To find which lens corrects myopia and which lens corrects hypermetropia.',
        materials: ['Model eye', 'Concave lens', 'Convex lens', 'Object chart'],
        safety: 'Lenses are fragile — handle them by the edges.' },
      { id: 'scattering', activity: 'Activity 10.3', title: 'Scattering of light', short: 'Make a sunset in a beaker with sodium thiosulphate.',
        aim: 'To see how tiny particles scatter blue light and let red light pass through.',
        materials: ['Beaker of water', 'Sodium thiosulphate', 'Conc. H₂SO₄ (few drops)', 'Light source', 'Screen'],
        safety: 'Your teacher adds the acid. Do this in a well-ventilated room.' },
    ],
  },
  {
    no: 11, slug: 'lesson11', title: 'Electricity', subject: 'physics', color: '#ef4444', icon: 'bolt',
    blurb: 'Build real circuits, read meters and discover Ohm’s law yourself.',
    experiments: [
      { id: 'ohms-law', activity: 'Activity 11.1', title: 'Ohm’s law', short: 'Add cells, read the ammeter and voltmeter, plot V–I.',
        aim: 'To find the relation between the potential difference across a nichrome wire and the current through it.',
        materials: ['Nichrome wire', 'Ammeter (0–1 A)', 'Voltmeter (0–5 V)', '4 cells of 1.5 V', 'Plug key', 'Connecting wires'],
        safety: 'Remove the plug key between readings so the wire does not heat up.' },
      { id: 'resistance-factors', activity: 'Activity 11.2', title: 'What decides resistance?', short: 'Swap wires of different length, thickness and material.',
        aim: 'To study how the resistance of a wire depends on its length, its area of cross-section and its material.',
        materials: ['Nichrome wires (l, 2l)', 'Thick nichrome wire', 'Copper wire', 'Cell', 'Ammeter', 'Plug key'],
        safety: 'Do not keep the circuit closed for long.' },
      { id: 'series-parallel', activity: 'Activity 11.3–11.4', title: 'Resistors in series and parallel', short: 'Join resistors two ways and compare the current.',
        aim: 'To compare resistors joined in series and in parallel, and find their total resistance.',
        materials: ['Three resistors', 'Battery', 'Ammeter', 'Voltmeter', 'Plug key', 'Wires'],
        safety: 'Check the meter + and − terminals before closing the key.' },
    ],
  },
  {
    no: 12, slug: 'lesson12', title: 'Magnetic Effects of Electric Current', subject: 'physics', color: '#e11d48', icon: 'magnet',
    blurb: 'Map magnetic fields with compasses and iron filings and make a wire jump.',
    experiments: [
      { id: 'field-around-wire', activity: 'Activity 12.1–12.4', title: 'Magnetic field of a current', short: 'Compasses swing round a current-carrying wire.',
        aim: 'To show that an electric current produces a magnetic field, and that its direction depends on the direction of the current.',
        materials: ['Thick copper wire', 'Cardboard', 'Iron filings', 'Compass needles', 'Battery', 'Rheostat', 'Plug key'],
        safety: 'Do not keep the current on for long — the wire heats up.' },
      { id: 'force-on-conductor', activity: 'Activity 12.7', title: 'Force on a current-carrying rod', short: 'A rod in a magnet jumps when current flows.',
        aim: 'To show that a current-carrying conductor in a magnetic field experiences a force, and to find its direction.',
        materials: ['Aluminium rod', 'Horseshoe magnet', 'Battery', 'Plug key', 'Connecting wires', 'Stand'],
        safety: 'Keep magnets away from phones and watches.' },
    ],
  },
];

export const allExperiments = lessons.flatMap((l) => l.experiments.map((e) => ({ ...e, lesson: l })));
export const findExperiment = (id) => allExperiments.find((e) => e.id === id);
export const findLesson = (slug) => lessons.find((l) => l.slug === slug || String(l.no) === String(slug));
export function nextExperiment(id) {
  const i = allExperiments.findIndex((e) => e.id === id);
  return i >= 0 && i < allExperiments.length - 1 ? allExperiments[i + 1] : null;
}
