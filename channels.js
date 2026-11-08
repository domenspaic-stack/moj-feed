// Začetni kanali po temah. Feed se gradi iz najnovejših videov teh kanalov (1 enota kvote na kanal),
// zato osveževanje skoraj ne porablja kvote. Iskanje se uporablja samo za odkrivanje novih kanalov.
// Ključ je ID teme ali ime teme z malimi črkami.
'use strict';
const SEED_CHANNELS = {
  't-rast': {
    sl: [['UCC_DTbfCRJffKvot-vhDhrw', 'Klepet ob kavi'], ['UCX_9zG7yhShsce5B_BoBy-Q', 'Minka Gantar'], ['UCZsOByRAn2Gayi29t7Q6cXg', 'Anima Collective'], ['UC28JJ1Xe4ZhPTK-GTtr4CxQ', 'ZaLife'], ['UCXgZEswYXBUci9NlEnEJU8A', 'Tanja Pia Metelko'], ['UC2tGvPBSeEYfj_FOThtxUnw', 'Ursa Milavec'], ['UC_nKVlOD4DDenoYS3TvhE8w', 'Rok Kokalj'], ['UCjBhAG7KpAzrTL0v35YzeSw', 'Ocvirki Podkast'], ['UCUO973L_tzI4vUau2Ijn0jg', 'Orgonski Wellness']],
    sh: [['UCPXm66QaDEQK_7mFabbxO4Q', 'Balansiranje'], ['UChqylpzjDRs5VTOEuD5cf3w', 'Bridge Communications'], ['UCz235EwRUwzmjXpMmlsb-Kg', 'hipnozainstitut'], ['UC9qidP566ZfyHa1ZbH0hWQA', 'Ivan Kosogor Podkast Klipovi']],
    en: [['UCHl3aFKS0bY0d8JwqNysaeA', 'The Mindset Mentor Podcast'], ['UCtUId5WFnN82GdDy7DgaQ7w', 'Better Ideas'], ['UCX3R4xuKXIhoaxj44HGmhlw', 'Dan Zakaria'], ['UCFRUDZUCGDlZGeGfftBovXw', 'simple, actually'], ['UC2r0MaYV4ni7rilxvcjZ-mg', 'Jim Rohn Real Seminars'], ['UCnVjokNLDX1yh3Y4kc0euRw', 'Young James'], ['UC-dmJ79518WlKMbsu50eMTQ', 'Clark Kegley'], ['UCPjk5nMTYvHAsah3pVZIBYQ', 'Into the Next Podcast'], ['UCXtu3iJQRFvLnOi9ETQKpUg', 'Joe Bart Philosophy'], ['UCbk_QsfaFZG6PdQeCvaYXJQ', 'Jay Shetty Podcast']],
  },
  't-ai': {
    sl: [['UC4ro8_zd0c5ztLwN-5E5DwQ', 'Klemen Selakovic – AIDEA podkast'], ['UCZl3sRNY1Efy8txjJRgCr4g', 'SBC - Klub slovenskih podjetnikov'], ['UCsc1va5dSCjCZE-ywfNkliA', 'Jakob Jan Pernuš'], ['UCZKX-vrMOWG4xOKZMN2xypg', 'Jakob Jurca'], ['UCGBO6EahCqQSyXIws1MQdDg', 'Future Business Tech'], ['UCiBP9RA_YWpQX-CoIWHlYew', 'UNDERDOG | Jure Laharnar'], ['UCE0-acFJdnTPUCYlYoiq_fg', 'Neural Nutshell']],
    sh: [],
    en: [['UCKWaEZ-_VweaEx1j62do_vQ', 'IBM Technology'], ['UC4JX40jDee_tINbkjycV4Sg', 'Tech With Tim'], ['UC0yHbz4OxdQFwmVX2BBQqLg', 'AI Master'], ['UCZ3KGRwOA_uONNE_6VGG2bA', 'Roboverse'], ['UCPGrgwfbkjTIgPoOh2q1BAg', 'David Ondrej'], ['UCJS9pqu9BzkAMNTmzNMNhvg', 'Google Cloud Tech'], ['UCrB7UFnkosBjAhOg3a9NdWw', 'Grace Leung'], ['UC8butISFwT-Wl7EV0hUK0BQ', 'freeCodeCamp.org']],
  },
  't-prodaja': {
    sl: [['UCI0xkARFVpAJcSuKWFq_zvw', 'Ruzmir Avdic'], ['UC8ahUXkjaeS8T0mJExJvNOQ', 'Empire State Balkan']],
    sh: [['UCGA5kRvPaYzfusqYU0XvD8Q', 'DOKTOR HABI'], ['UCLQ23pQvULJ5v4MIKef_4Fg', 'Milan Zeljko'], ['UCerg7-TfQRfEEeodeGKBG8w', 'PolaCEO'], ['UChWoOtenh-aIzedpMNCwVZQ', 'Sonja Dakić']],
    en: [['UC9h49G20FRAah8AbsbV9xBw', 'Coach Animesh'], ['UCIP99i3azLdyYRxnUkSLJ7g', 'Andy Elliott'], ['UC6v3pxiflKUnrrVKDnpQzPA', 'Andres Contreras-Grassi'], ['UCQ5mWx_XYGRbpcV8zjGhorg', 'Jeremy Miner'], ['UC7uC7Zg3o1Q15u63vgJy_nA', 'Shelby Sapp'], ['UCdMrj5kezVrTiqZoFRqGxAg', 'BigDeal by Codie Sanchez'], ['UCABR204CFV9ZoMz69TyspzA', 'Daniel Priestley'], ['UCZWJpNzboZmwu4c76wj5nCA', 'Erik Fisher']],
  },
  't-moska': {
    sl: [['UCLpzB57GPloNcfTEHTFrUuw', 'Smart Talks Podcast'], ['UC02MFxI5tKfOLKUCXq8wR9A', 'Benessere Podcast | Jani Konjedic'], ['UCrqZBvCZ_8C2AsoDqbClvoA', 'Janko Bogataj'], ['UCnWstOZZ3QeJfSUfQz1Cdkg', 'David Koprivšek']],
    sh: [['UCAG1B_rk4qVJi_xKYvvsr2Q', 'Nenad Ljubić'], ['UCfXCp4NXX37hGSkscEhneBg', 'Human Factor'], ['UC_I47G0V3F_R2cbgp3_HAiw', 'Mrvica mudrosti']],
    en: [['UC5fqfItld8kQufe3djD6wAw', 'Brett Maverick'], ['UC2exoyYcKLknC5IWiwdAihQ', 'ManTalks'], ['UC-XMoeMXbYrMlvmyLSwDd3g', 'Jack Hopkins'], ['UCNQsW_JBuc5aYqLyct6M7mA', 'The Alchemist'], ['UCXxyVHABT08NyZEL74oEfnA', 'Bygone Philosophy']],
  },
  't-tao': {
    sl: [],
    sh: [['UCrU18Xe8CjinL1vuys94CjA', 'Hikari Zen'], ['UCDkP4C1OMEmHCB-54Ll3-eg', 'Zen Celesta']],
    en: [['UCbaCwW4QP4OagKF17hdmlvA', 'The Art of Flow'], ['UCD-TO23_eui_SP2RwZL1V0g', 'Sheng Huang'], ['UCpX4US0rF4sUDgEH05RiJXg', 'Flowing Void'], ['UCPTpt_KE3l0wd31hESgHtsQ', 'Clarity & Zen'], ['UC5uf5ehcjU6kr73XRox1E8Q', 'The East Made Simple'], ['UCqehGVpUNxV2W5WV8U-fxFg', 'Daily Tao Wisdom'], ['UCz6X8QK9_JG49hJxnzAu-1w', 'Samaneri Jayasāra'], ['UCDLL9WNyJr7D3nU11BMzCag', 'The Classic Mind'], ['UCdvbw2P2_aDa97lQWuVekmg', 'The Tao Within'], ['UCfgzCYuO7CBBRNhpGYWQryg', 'TangSaying']],
  },
  'motivation': {
    en: [['UCHl3aFKS0bY0d8JwqNysaeA', 'The Mindset Mentor Podcast'], ['UCtUId5WFnN82GdDy7DgaQ7w', 'Better Ideas'], ['UC2r0MaYV4ni7rilxvcjZ-mg', 'Jim Rohn Real Seminars'], ['UC-dmJ79518WlKMbsu50eMTQ', 'Clark Kegley'], ['UCnVjokNLDX1yh3Y4kc0euRw', 'Young James']],
  },
  'business': {
    sl: [['UCZl3sRNY1Efy8txjJRgCr4g', 'SBC - Klub slovenskih podjetnikov'], ['UCiBP9RA_YWpQX-CoIWHlYew', 'UNDERDOG | Jure Laharnar']],
    sh: [['UCerg7-TfQRfEEeodeGKBG8w', 'PolaCEO'], ['UC8ahUXkjaeS8T0mJExJvNOQ', 'Empire State Balkan']],
    en: [['UCA-mWX9CvCTVFWRMb9bKc9w', 'Dan Martell'], ['UCABR204CFV9ZoMz69TyspzA', 'Daniel Priestley'], ['UCdMrj5kezVrTiqZoFRqGxAg', 'BigDeal by Codie Sanchez'], ['UC_Ktic72t5bDX_3go_9u_pg', 'Vusi Thembekwayo'], ['UCshPyRiu9XTQb2gEagNt-3A', 'Raj Shamani Clips']],
  },
};
