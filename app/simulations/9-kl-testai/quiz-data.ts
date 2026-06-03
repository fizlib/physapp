export interface QuizQuestion {
    id: string
    answer: string
    definition: string
    mode?: 'quantity' | 'unit' | 'formula'
    randomGroupId?: string
    symbol?: string
}

export interface QuizTopicSet {
    id: string
    title: string
    questions: QuizQuestion[]
    answerOptions?: string[]
}

export const QUIZ_TOPICS: QuizTopicSet[] = [
    {
        id: 'fizikiniu-dydziu-apibrezimai',
        title: 'Fizikinių dydžių apibrėžimai',
        questions: [
            {
                id: 'vidine-energija',
                answer: 'Vidinė energija (U)',
                definition: 'Visų kūną sudarančių dalelių judėjimo (kinetinė) ir jų sąveikos (potencinė) energija.',
            },
            {
                id: 'silumos-kiekis',
                answer: 'Šilumos kiekis (Q)',
                definition: 'Vidinės energijos dalis, kurią kūnas gauna arba kurios netenka vykstant šilumos perdavimui.',
            },
            {
                id: 'savitoji-lydymosi-siluma',
                answer: 'Savitoji lydymosi (kietėjimo) šiluma (λ)',
                definition: 'Šiluma, kurios reikia 1 kg kietosios (skystosios) būsenos medžiagos paversti skystosios (kietosios) būsenos medžiaga jos lydymosi (kietėjimo) temperatūroje.',
            },
            {
                id: 'savitoji-garavimo-siluma',
                answer: 'Savitoji garavimo šiluma (L)',
                definition: 'Šilumos kiekis, kurio reikia 1 kg skysčio paversti garais jo virimo temperatūroje.',
            },
            {
                id: 'savitoji-degimo-siluma',
                answer: 'Savitoji degimo šiluma (q)',
                definition: 'Šilumos kiekis, kurį išskiria visiškai sudegdamas 1 kg masės kuras.',
            },
            {
                id: 'naudingumo-koeficientas',
                answer: 'Naudingumo koeficientas (η)',
                definition: 'Mechanizmų efektyvumą rodantis dydis.',
            },
            {
                id: 'kelias',
                answer: 'Kelias (s)',
                definition: 'Trajektorijos, kuria juda kūnas, ilgis.',
            },
            {
                id: 'poslinkis',
                answer: 'Poslinkis (s⃗)',
                definition: 'Kryptinė atkarpa, sujungianti pradinį kūno trajektorijos tašką su galiniu.',
            },
            {
                id: 'vidutinis-greitis',
                answer: 'Vidutinis greitis (v_vid)',
                definition: 'Fizikinis dydis, apibūdinantis kūno judėjimo spartą per tam tikrą laiko tarpą.',
            },
            {
                id: 'momentinis-greitis',
                answer: 'Momentinis greitis (v⃗)',
                definition: 'Greitis, kuriuo kūnas juda tam tikru laiko momentu.',
            },
            {
                id: 'pagreitis',
                answer: 'Pagreitis (a⃗)',
                definition: 'Fizikinis dydis, apibūdinantis greičio kitimo spartą.',
            },
            {
                id: 'laisvojo-kritimo-pagreitis',
                answer: 'Laisvojo kritimo pagreitis (g⃗)',
                definition: 'Nuo kūno masės nepriklausantis laisvai krintančių kūnų pagreitis.',
            },
            {
                id: 'jega',
                answer: 'Jėga (F⃗)',
                definition: 'Fizikinis dydis, nusakantis vienų kūnų poveikį kitiems.',
            },
            {
                id: 'jegos-atstojamoji',
                answer: 'Jėgų atstojamoji (F⃗_ats)',
                definition: 'Visų kūną veikiančių jėgų vektorinė suma.',
            },
            {
                id: 'tamprumo-jega',
                answer: 'Tamprumo jėga (F⃗_tampr)',
                definition: 'Jėga, kuria deformuotas kūnas veikia kitus kūnus.',
            },
            {
                id: 'atramos-reakcijos-jega',
                answer: 'Atramos reakcijos jėga (N⃗)',
                definition: 'Tamprumo jėga, kuria atrama veikia ant jos esantį kūną',
            },
            {
                id: 'sunkis',
                answer: 'Sunkis (F⃗_s)',
                definition: 'Jėga, kuria Žemė traukia kūną.',
            },
            {
                id: 'kuno-svoris',
                answer: 'Kūno svoris (P⃗)',
                definition: 'Jėga, kuria Žemės traukiamas kūnas veikia atramą arba pakabą.',
            },
            {
                id: 'trintis',
                answer: 'Trintis (F⃗_tr)',
                definition: 'Jėga, kuri priešinasi judėjimui tarp bet kokių susiliečiančių kūnų paviršių.',
            },
            {
                id: 'slegis',
                answer: 'Slėgis (p)',
                definition: 'Jėgos ir jos veikiamo ploto santykis.',
            },
            {
                id: 'archimedo-jega',
                answer: 'Archimedo jėga (F⃗_A)',
                definition: 'Jėga, kuri susidaro dėl slėgių skirtumo ir stumia aukštyn į skystį (ar dujas) panardintą kūną.',
            },
        ],
    },
    {
        id: 'pagrindiniai-matavimo-vienetai',
        title: 'Pagrindiniai matavimo vienetai',
        answerOptions: ['J', 'N', 'kg', '°C', 'J/kg', 'm', 'm/s', 'm/s²', 'Pa', '%', 'W', 'kg/m³', 'm²', 'm³', 's'],
        questions: [
            {
                id: 'unit-vidine-energija',
                mode: 'unit',
                answer: 'J',
                definition: 'Vidinė energija (U)',
                symbol: 'U',
            },
            {
                id: 'unit-silumos-kiekis',
                mode: 'unit',
                answer: 'J',
                definition: 'Šilumos kiekis (Q)',
                symbol: 'Q',
            },
            {
                id: 'unit-savitoji-lydymosi-siluma',
                mode: 'unit',
                answer: 'J/kg',
                definition: 'Savitoji lydymosi (kietėjimo) šiluma (λ)',
                symbol: 'λ',
            },
            {
                id: 'unit-savitoji-garavimo-siluma',
                mode: 'unit',
                answer: 'J/kg',
                definition: 'Savitoji garavimo šiluma (L)',
                symbol: 'L',
            },
            {
                id: 'unit-savitoji-degimo-siluma',
                mode: 'unit',
                answer: 'J/kg',
                definition: 'Savitoji degimo šiluma (q)',
                symbol: 'q',
            },
            {
                id: 'unit-naudingumo-koeficientas',
                mode: 'unit',
                answer: '%',
                definition: 'Naudingumo koeficientas (η)',
                symbol: 'η',
            },
            {
                id: 'unit-kelias',
                mode: 'unit',
                answer: 'm',
                definition: 'Kelias (s)',
                symbol: 's',
            },
            {
                id: 'unit-poslinkis',
                mode: 'unit',
                answer: 'm',
                definition: 'Poslinkis (|s⃗|)',
                symbol: '|s⃗|',
            },
            {
                id: 'unit-vidutinis-greitis',
                mode: 'unit',
                answer: 'm/s',
                definition: 'Vidutinis greitis (v_vid)',
                symbol: 'v_vid',
            },
            {
                id: 'unit-momentinis-greitis',
                mode: 'unit',
                answer: 'm/s',
                definition: 'Momentinis greitis (v⃗)',
                symbol: 'v⃗',
            },
            {
                id: 'unit-pagreitis',
                mode: 'unit',
                answer: 'm/s²',
                definition: 'Pagreitis (a⃗)',
                symbol: 'a⃗',
            },
            {
                id: 'unit-laisvojo-kritimo-pagreitis',
                mode: 'unit',
                answer: 'm/s²',
                definition: 'Laisvojo kritimo pagreitis (g⃗)',
                symbol: 'g⃗',
            },
            {
                id: 'unit-slegis',
                mode: 'unit',
                answer: 'Pa',
                definition: 'Slėgis (p)',
                symbol: 'p',
            },
            {
                id: 'unit-tankis',
                mode: 'unit',
                answer: 'kg/m³',
                definition: 'Tankis (ρ)',
                symbol: 'ρ',
            },
            {
                id: 'unit-plotas',
                mode: 'unit',
                answer: 'm²',
                definition: 'Plotas (S)',
                symbol: 'S',
            },
            {
                id: 'unit-turis',
                mode: 'unit',
                answer: 'm³',
                definition: 'Tūris (V)',
                symbol: 'V',
            },
            {
                id: 'unit-laikas',
                mode: 'unit',
                answer: 's',
                definition: 'Laikas (t)',
                symbol: 't',
            },
            {
                id: 'unit-jega',
                mode: 'unit',
                answer: 'N',
                definition: 'Jėga (F⃗)',
                randomGroupId: 'force-units',
                symbol: 'F⃗',
            },
            {
                id: 'unit-jegos-atstojamoji',
                mode: 'unit',
                answer: 'N',
                definition: 'Jėgų atstojamoji (F⃗_ats)',
                randomGroupId: 'force-units',
                symbol: 'F⃗_ats',
            },
            {
                id: 'unit-tamprumo-jega',
                mode: 'unit',
                answer: 'N',
                definition: 'Tamprumo jėga (F⃗_tampr)',
                randomGroupId: 'force-units',
                symbol: 'F⃗_tampr',
            },
            {
                id: 'unit-atramos-reakcijos-jega',
                mode: 'unit',
                answer: 'N',
                definition: 'Atramos reakcijos jėga (N⃗)',
                randomGroupId: 'force-units',
                symbol: 'N⃗',
            },
            {
                id: 'unit-sunkis',
                mode: 'unit',
                answer: 'N',
                definition: 'Sunkis (F⃗_s)',
                randomGroupId: 'force-units',
                symbol: 'F⃗_s',
            },
            {
                id: 'unit-kuno-svoris',
                mode: 'unit',
                answer: 'N',
                definition: 'Kūno svoris (P⃗)',
                randomGroupId: 'force-units',
                symbol: 'P⃗',
            },
            {
                id: 'unit-trintis',
                mode: 'unit',
                answer: 'N',
                definition: 'Trintis (F⃗_tr)',
                randomGroupId: 'force-units',
                symbol: 'F⃗_tr',
            },
            {
                id: 'unit-archimedo-jega',
                mode: 'unit',
                answer: 'N',
                definition: 'Archimedo jėga (F⃗_A)',
                randomGroupId: 'force-units',
                symbol: 'F⃗_A',
            },
        ],
    },
    {
        id: 'formules',
        title: 'Formulės',
        questions: [
            {
                id: 'formula-sunkio-jega',
                mode: 'formula',
                answer: 'F_s=mg',
                definition: 'Sunkio jėgos formulė',
            },
            {
                id: 'formula-momentinis-greitis',
                mode: 'formula',
                answer: 'v_vec=s_vec/t',
                definition: 'Momentinio greičio formulė',
            },
            {
                id: 'formula-vidutinis-greitis',
                mode: 'formula',
                answer: 'v_vid=s_visas/t_visas',
                definition: 'Vidutinio greičio formulė',
            },
            {
                id: 'formula-pagreitis',
                mode: 'formula',
                answer: 'a_vec=(v_vec-v_0_vec)/t',
                definition: 'Pagreičio formulė',
            },
            {
                id: 'formula-kelias',
                mode: 'formula',
                answer: 's=v_0*t+(a*t^2)/2',
                definition: 'Judėjimo lygtis',
            },
            {
                id: 'formula-antrasis-niutono-desnis',
                mode: 'formula',
                answer: 'a_vec=F_ats_vec/m',
                definition: 'Antrojo Niutono dėsnio formulė',
            },
            {
                id: 'formula-jegu-atstojamoji',
                mode: 'formula',
                answer: 'F_ats_vec=F_1_vec+F_2_vec+F_3_vec+...',
                definition: 'Jėgų atstojamosios formulė',
            },
            {
                id: 'formula-gravitacine-jega',
                mode: 'formula',
                answer: 'F=G*(m_1*m_2)/R^2',
                definition: 'Gravitacinės jėgos formulė',
            },
            {
                id: 'formula-gravitacinis-pagreitis',
                mode: 'formula',
                answer: 'g=G*M/(R+r)^2',
                definition: 'Gravitacinio pagreičio formulė',
            },
            {
                id: 'formula-treciasis-niutono-desnis',
                mode: 'formula',
                answer: 'F_1_vec=-F_2_vec',
                definition: 'Trečiojo Niutono dėsnio formulė',
            },
            {
                id: 'formula-huko-desnis',
                mode: 'formula',
                answer: 'F_t=k*delta_l',
                definition: 'Huko dėsnio formulė',
            },
            {
                id: 'formula-slydimo-trinties-jega',
                mode: 'formula',
                answer: 'F_tr=mu*N',
                definition: 'Slydimo trinties jėgos formulė',
            },
            {
                id: 'formula-didziausia-rimties-trinties-jega',
                mode: 'formula',
                answer: 'F_tr_max=mu_0*N',
                definition: 'Didžiausios rimties trinties jėgos formulė',
            },
            {
                id: 'formula-slegis',
                mode: 'formula',
                answer: 'p=F/S',
                definition: 'Slėgio formulė',
            },
            {
                id: 'formula-tankis',
                mode: 'formula',
                answer: 'rho=m/V',
                definition: 'Tankio formulė',
            },
            {
                id: 'formula-skyscio-stulpelio-slegis',
                mode: 'formula',
                answer: 'p=rho*g*h',
                definition: 'Skysčio stulpelio slėgio formulė',
            },
            {
                id: 'formula-archimedo-jega',
                mode: 'formula',
                answer: 'F_A=rho_s*g*V_s',
                definition: 'Archimedo jėgos formulė',
            },
        ],
    },
]
