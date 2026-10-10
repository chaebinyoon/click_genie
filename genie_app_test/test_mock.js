const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');
appJs = appJs.replace(/document\.querySelector/g, '(()=>({style:{}}))');
appJs = appJs.replace(/document\.getElementById/g, '(()=>({style:{}}))');
appJs = appJs.replace(/document\.body/g, '({})');
appJs = appJs.replace(/window\./g, '({}).');
appJs = appJs.replace(/localStorage/g, '({getItem:()=>null,setItem:()=>{}})');
appJs = appJs.replace(/alert/g, 'console.log');

const mockDOM = `
let app = { innerHTML: '' };
let state = {
  tab: 'home',
  screen: 'home',
  chips: ['전체', '음악', '방송'],
  chip: '전체',
  toastMessage: '',
  showFullPlayer: false,
  isSearchEditing: false,
  sheet: '',
  queueTracks: [],
  selectedSongIds: [],
  selectedSearchIds: [],
  nowPlaying: null
};
let tracks = [];
let albums = [];
`;
fs.writeFileSync('output.html', mockDOM + appJs + '; render(); console.log(app.innerHTML);');
