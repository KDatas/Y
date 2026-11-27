// =========================================================================
// 3. 初期サンプルデータ（2020〜2026年）
// =========================================================================
function buildSampleData() {
  const streams = [];
  const fullVideos = [];
  const shortVideos = [];
  const setlist = [];
  const events = [];

  const yearProfiles = {
    2020: { sBase: 22, hBase: 1.4, fBase: 2, sgBase: 2, evBase: 1 },
    2021: { sBase: 26, hBase: 1.5, fBase: 2, sgBase: 2, evBase: 1 },
    2022: { sBase: 31, hBase: 1.4, fBase: 3, sgBase: 3, evBase: 2 },
    2023: { sBase: 35, hBase: 1.5, fBase: 3, sgBase: 4, evBase: 2 },
    2024: { sBase: 38, hBase: 1.6, fBase: 3, sgBase: 4, evBase: 3 },
    2025: { sBase: 42, hBase: 1.5, fBase: 4, sgBase: 5, evBase: 3 },
    2026: { sBase: 40, hBase: 1.5, fBase: 3, sgBase: 4, evBase: 3 }
  };

  const sampleCats = ['雑談', '企画', 'ゲーム', '歌枠', 'コラボ', 'カメラ', '飲酒', 'スペース', '告知'];
  const sampleFullTypes = ['Solo', 'Original', 'Collab', 'Live action'];
  const sampleComposers = ['内緒のピアス', 'トーマ', 'DECO*27', 'バルーン', 'ぬゆり', 'Kanaria', '煮ル果実', 'Ayase'];
  const sampleIllust = ['A氏', 'B氏', 'C氏', 'D氏'];
  const sampleMix = ['MIX師X', 'MIX師Y', '雪見'];
  const sampleMovie = ['動画師P', '動画師Q', '動画師R'];
  const sampleSongsBase = [
    '少女レイ', '夏の半券', 'シエレトワール', 'About me', '小夜子', 'うつけ論争',
    'とくべちゅ、して', 'フラジール', '白い雪のプリンセスは', 'バレリーコ', 'さよならエレジー',
    '夕染', 'お気に召すまま', 'ライアーダンス'
  ];
  const sampleSongs2026New = [
    '御伽話のような', '夜撫でるメノウ', 'ヘモグロビン', 'エンヴィキャットウォーク', 'キメラ'
  ];
  const sampleEventTypes = [
    { type: 'ライブ', ch: 'リアル' },
    { type: 'リリイベ', ch: 'リアル' },
    { type: 'ファンミ', ch: 'リアル' },
    { type: '特典会', ch: 'オンライン' },
    { type: 'オンラインライブ', ch: 'オンライン' }
  ];

  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  for (let y = 2020; y <= 2026; y++) {
    const prof = yearProfiles[y];
    const maxM = y === 2026 ? 11 : 12;
    const songPool = y === 2026 ? [...sampleSongsBase, ...sampleSongs2026New] : sampleSongsBase;
    for (let m = 1; m <= maxM; m++) {
      const sCount = Math.max(15, Math.round(prof.sBase + (rand() - 0.5) * 14));
      for (let i = 0; i < sCount; i++) {
        const d = Math.min(28, 1 + Math.floor(rand() * 28));
        const hr = Math.floor(rand() * 24);
        const min = Math.floor(rand() * 60);
        const isSinging = i < Math.max(1, Math.round(prof.sgBase + (rand() - 0.5) * 2));
        const cat1 = isSinging ? '歌枠' : sampleCats[Math.floor(rand() * sampleCats.length)];
        const tags = [cat1];
        if (!isSinging && rand() > 0.72) {
          const cat2 = sampleCats[Math.floor(rand() * sampleCats.length)];
          if (cat2 !== cat1) tags.push(cat2);
        }
        const isErr = rand() < 0.03;
        const sec = Math.round((0.6 + rand() * 2.1) * 3600);
        const dur = Math.round((sec / 3600) * 1000) / 1000;
        const mm = String(m).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const hh = String(hr).padStart(2, '0');
        const mn = String(min).padStart(2, '0');
        streams.push({
          _uid: makeUid('st'),
          year: y, month: m, day: d, hour: hr,
          dow: new Date(y, m - 1, d).getDay(),
          dateStr: `${y}/${mm}/${dd} ${hh}:${mn}`,
          sortKey: `${y}${mm}${dd}${hh}${mn}`,
          title: isErr ? `接続テスト枠 (${m}/${d})` : `${tags.join('・')}配信 #${i + 1}`,
          tags,
          seconds: sec,
          hours: dur,
          isError: isErr
        });
      }

      const fCount = Math.max(1, Math.round(prof.fBase + (rand() - 0.5) * 3));
      for (let i = 0; i < fCount; i++) {
        const d = Math.min(28, 3 + i * 7);
        const mm = String(m).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const tp = sampleFullTypes[Math.floor(rand() * sampleFullTypes.length)];
        const comp = sampleComposers[Math.floor(rand() * sampleComposers.length)];
        fullVideos.push({
          _uid: makeUid('fv'),
          year: y, month: m, day: d,
          dateStr: `${y}/${mm}/${dd}`,
          sortKey: `${y}${mm}${dd}`,
          title: `${sampleSongsBase[(m + i + y) % sampleSongsBase.length]} (${tp})`,
          type: tp,
          composer: comp,
          illustrator: sampleIllust[(m + i) % sampleIllust.length],
          mix: sampleMix[(m + i) % sampleMix.length],
          movie: sampleMovie[(m + i) % sampleMovie.length],
          vocal: tp === 'Collab' ? '雪見, ゲスト' : '雪見',
          platform: 'YouTube',
          isExcluded: false
        });
      }

      if (m === 4) {
        fullVideos.push({
          _uid: makeUid('fv'),
          year: y, month: m, day: 8,
          dateStr: `${y}/04/08`,
          sortKey: `${y}0408`,
          title: `"untransparent" Live Documentary`,
          type: 'Live action',
          composer: '',
          illustrator: '',
          mix: '',
          movie: '動画師P',
          vocal: '雪見',
          platform: 'YouTube',
          isExcluded: true
        });
      }

      const shCount = y >= 2024 ? Math.max(2, Math.round(5 + rand() * 6)) : 2;
      for (let i = 0; i < shCount; i++) {
        const d = Math.min(28, 2 + i * 2);
        const mm = String(m).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const isXOnly = rand() < 0.14;
        const plat = isXOnly ? 'X' : (rand() > 0.4 ? 'YouTube, TikTok' : 'YouTube');
        const cat = rand() > 0.62 ? 'Full関連' : 'Shortのみ';
        shortVideos.push({
          _uid: makeUid('sv'),
          year: y, month: m, day: d,
          dateStr: `${y}/${mm}/${dd}`,
          sortKey: `${y}${mm}${dd}`,
          title: `${sampleSongsBase[(m * 2 + i) % sampleSongsBase.length]} Short`,
          composer: sampleComposers[(m + i) % sampleComposers.length],
          platform: plat,
          category: cat,
          isExcluded: isXOnly
        });
      }

      if (y >= 2025) {
        const slSessions = [
          { type: '歌枠', day: 5, title: `${y}年${m}月 歌枠 #1`, cnt: 5 },
          {
            type: m % 4 === 0 ? 'LIVE (solo)' : (m % 4 === 2 ? 'LIVE (Comp)' : (m % 4 === 3 ? 'LIVE (Guest)' : 'カラオケ')),
            day: 18,
            title: `${y}年${m}月 ${m % 4 === 0 ? 'ワンマンLIVE' : (m % 4 === 2 ? '対バンLIVE' : (m % 4 === 3 ? 'ゲスト出演LIVE' : 'カラオケ枠'))}`,
            cnt: m % 4 === 0 ? 10 : (m % 4 === 2 ? 5 : (m % 4 === 3 ? 3 : 4))
          }
        ];
        const mm = String(m).padStart(2, '0');
        slSessions.forEach(sess => {
          const dd = String(sess.day).padStart(2, '0');
          for (let k = 0; k < sess.cnt; k++) {
            const song = songPool[Math.floor(rand() * songPool.length)];
            setlist.push({
              _uid: makeUid('sl'),
              year: y, month: m, day: sess.day,
              dateStr: `${y}/${mm}/${dd}`,
              sortKey: `${y}${mm}${dd}`,
              streamTitle: sess.title,
              type: sess.type,
              title: song,
              url: ''
            });
          }
        });
      }

      const evCount = Math.max(0, Math.round(prof.evBase * 0.6 + (rand() - 0.35) * 3));
      for (let i = 0; i < evCount; i++) {
        const d = Math.min(28, 6 + i * 9);
        const mm = String(m).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const evObj = sampleEventTypes[Math.floor(rand() * sampleEventTypes.length)];
        events.push({
          _uid: makeUid('ev'),
          year: y, month: m, day: d,
          dateStr: `${y}/${mm}/${dd}`,
          sortKey: `${y}${mm}${dd}`,
          title: `${y}年${m}月 ${evObj.type}イベント`,
          type: evObj.type,
          channel: evObj.ch
        });
      }
    }
  }

  return { streams, fullVideos, shortVideos, setlist, events };
}

