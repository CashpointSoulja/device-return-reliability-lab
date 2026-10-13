#!/usr/bin/env python3
"""Compose authentic browser capture with separately recorded scene narration."""
import argparse, json, pathlib, subprocess

def run(args):
    subprocess.run(args, check=True)

def duration(file):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(file)],text=True))

p=argparse.ArgumentParser()
p.add_argument('--capture',type=pathlib.Path,default=pathlib.Path('work/recording/capture'))
p.add_argument('--voices',type=pathlib.Path,default=pathlib.Path('work/recording/voices'))
p.add_argument('--plan',type=pathlib.Path,default=pathlib.Path('recording/scenes.json'))
p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('work/recording/walkthrough.mp4'))
p.add_argument('--start-offset',type=float,required=True,help='Verified raw video timestamp of the first scene; inspect raw before selecting.')
a=p.parse_args()
plan=json.loads(a.plan.read_text())
manifest=json.loads((a.capture/'capture-manifest.json').read_text())
if not manifest['observedUrl'].startswith('https://'): raise SystemExit('Authentic public HTTPS capture is required.')
if len(manifest['scenes'])!=len(plan['scenes']): raise SystemExit('Capture is incomplete.')
total=sum(s['seconds'] for s in plan['scenes'])
if not 90<=total<=120: raise SystemExit('Walkthrough must last 90–120 seconds.')
for s in plan['scenes']:
    voice=a.voices/(s['id']+'.wav')
    if not voice.exists(): raise SystemExit(f'Missing spoken narration: {voice}')
    if duration(voice)>s['seconds']-0.2: raise SystemExit(f'Narration exceeds scene {s["id"]}; rerecord or revise.')
work=a.capture/'composition'
work.mkdir(parents=True,exist_ok=True)
a.output.parent.mkdir(parents=True,exist_ok=True)
normalized=work/'normalized.mp4'
# First retain observed source timing and resample it to CFR. Only trim this normalized source.
run(['ffmpeg','-y','-i',str(a.capture/'raw.webm'),'-vf','fps=30,setpts=N/(30*TB)','-an','-c:v','libx264','-preset','medium','-crf','18','-map_metadata','-1',str(normalized)])
if duration(normalized)<a.start_offset+total-0.1: raise SystemExit('Normalized source is shorter than the requested observed scenes.')
offset=a.start_offset
clips=[]
for i,s in enumerate(plan['scenes']):
    clip=work/f'{i+1:02d}-{s["id"]}.mp4'
    n=str(s['seconds'])
    run(['ffmpeg','-y','-ss',str(offset),'-i',str(normalized),'-i',str(a.voices/(s['id']+'.wav')),
         '-filter_complex',f'[0:v]trim=duration={n},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,setsar=1[v];[1:a]apad,atrim=duration={n},asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=9[a]',
         '-map','[v]','-map','[a]','-c:v','libx264','-crf','18','-preset','medium','-r','30','-c:a','aac','-ar','48000','-b:a','192k','-t',n,'-map_metadata','-1',str(clip)])
    clips.append(clip.resolve())
    # Inspect every scene beginning, middle and end, including transition boundaries.
    for label,t in [('begin',0.1),('middle',s['seconds']/2),('end',s['seconds']-0.1)]:
        run(['ffmpeg','-y','-ss',str(t),'-i',str(clip),'-frames:v','1',str(work/f'{i+1:02d}-{label}.png')])
    offset+=s['seconds']
listing=work/'clips.txt'
listing.write_text(''.join("file '"+str(f).replace("'","'\\''")+"'\n" for f in clips))
run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart','-map_metadata','-1','-metadata','title=Device Return Reliability Lab','-metadata','artist=Ayo Ahmed - Independent concept',str(a.output)])
review={'status':'requires_full_watch_and_listen','credit':'Ayo Ahmed - Independent concept','publicUrl':manifest['observedUrl'],'duration':duration(a.output),'reviewer':'Ayo Ahmed','reviewed':False,'required':['Watch full video with audio','Inspect each scene and all beginning/end frames','Confirm full dialog controls remain visible','Confirm cursor actions align with narration','Confirm no empty or falsely successful scenario results','Confirm no real personal data','Confirm synthetic status and unofficial disclaimer','Approve before outreach']}
(a.output.parent/'review-handoff.json').write_text(json.dumps(review,indent=2)+'\n')
print(f'Composed {a.output}; full watch/listen and explicit reviewer sign-off are still required.')
