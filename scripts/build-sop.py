from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from xml.sax.saxutils import escape

import os
font_dir=Path(os.environ.get('SOP_FONT_DIR','C:/Windows/Fonts'))
for n,f,fallback in [('UI','segoeui.ttf','Helvetica'),('UIB','segoeuib.ttf','Helvetica-Bold'),('UIL','segoeuil.ttf','Helvetica')]:
    if (font_dir/f).exists():
        pdfmetrics.registerFont(TTFont(n,str(font_dir/f)))
    else:
        pdfmetrics.registerFont(pdfmetrics.Font(n,fallback,'WinAnsiEncoding'))
pdfmetrics.registerFontFamily('UI',normal='UI',bold='UIB',italic='UI',boldItalic='UIB')
W,H=960,640
GREEN='#124D40';INK='#193B33';MUTED='#60756D';SAGE='#E6EFE8';PAPER='#F7F8F3';LINE='#D6E0D8';GOLD='#F3E8CC'
out=ROOT/'public/guide/Breach-Guide-SOP.pdf'
out.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(out),pagesize=(W,H))
c.setTitle('Breach Guide | A simple visual guide');c.setAuthor('Breach Guide')
logo=str(ROOT/'public/brand/breach-guide-logo.png')
errors=[]
def box(x,y,w,h,color=SAGE,r=14,stroke=None):
    c.setFillColor(HexColor(color));c.setStrokeColor(HexColor(stroke or color))
    c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=bool(stroke))
def txt(s,x,y,w=864,size=15,color=INK,font='UI',leading=None):
    p=Paragraph(s,ParagraphStyle('x',fontName=font,fontSize=size,leading=leading or size*1.4,textColor=HexColor(color)))
    aw,ah=p.wrap(w,H);p.drawOn(c,x,H-y-ah)
    if y < 600 and y+ah>598: errors.append((page_no,s[:50],y+ah))
    return ah
def label(s,x,y,color=MUTED):txt(s,x,y,size=10,color=color,font='UIB')
def title(s,sub):
    txt(s,48,87,size=34,font='UIB',leading=39)
    txt(sub,48,137,size=15,color=MUTED)
def new(n,section,heading=None,sub=None):
    global page_no
    if n>1:c.showPage()
    page_no=n;c.bookmarkPage(f'p{n}');c.addOutlineEntry(heading or 'Start here',f'p{n}',0)
    box(0,0,W,H,PAPER,0)
    c.drawImage(logo,48,H-64,width=32,height=37,mask='auto')
    label('BREACH GUIDE',94,31,GREEN);label(section.upper(),94,47)
    label('PUBLIC DEMO + LOCAL SETUP',725,37)
    c.setStrokeColor(HexColor(LINE));c.line(48,H-68,912,H-68)
    c.line(48,H-600,912,H-600)
    label('VISUAL SOP   /   VERSION 2.0   /   24 OCT 2026',48,614)
    label(f'{n:02d} / 14',864,614)
    if heading:title(heading,sub)
def badge(n,x,y):
    box(x,y,30,30,GREEN,15)
    c.setFillColor(HexColor('#FFFFFF'));c.setFont('UIB',14)
    c.drawCentredString(x+15,H-y-20,str(n))
def step(n,heading,body,x,y,w=385):
    badge(n,x,y);txt(heading,x+44,y,w-44,18,font='UIB');txt(body,x+44,y+32,w-44,14)
def callout(head,body,x=48,y=510,w=864,color=SAGE):
    box(x,y,w,72,color);txt(head,x+18,y+10,w-36,13,font='UIB');txt(body,x+18,y+32,w-36,12)
def command(s,x,y,w=864):
    box(x,y,w,42,GREEN,8);txt(escape(s),x+16,y+11,w-32,12,'#FFFFFF','Courier',17)
def screenshot(name,x,y,w,h):
    path=ROOT/f'docs/assets/sop/{name}.png';iw,ih=ImageReader(str(path)).getSize()
    scale=min((w-18)/iw,(h-18)/ih);dw,dh=iw*scale,ih*scale
    box(x,y,w,h,'#FFFFFF',12,LINE)
    c.drawImage(str(path),x+(w-dw)/2,H-y-9-dh,width=dw,height=dh,mask='auto')
def nav(head,desc,pno,y):
    box(48,y,864,67,'#FFFFFF',10,LINE);txt(head,66,y+10,610,18,font='UIB');txt(desc,66,y+36,700,12,color=MUTED)
    txt(f'{pno:02d}  →',836,y+18,65,19,color=GREEN,font='UIB');c.linkRect('',f'p{pno}',(48,H-y-67,912,H-y),relative=0,thickness=0)

new(1,'Your first confident steps')
c.drawImage(logo,48,H-220,width=96,height=111,mask='auto')
txt('A little clarity.<br/>One step at a time.',48,247,570,43,GREEN,'UIL',51)
txt('Your free visual guide to opening Breach Guide,<br/>answering six questions and saving your work.',48,371,540,19)
box(650,110,262,345,GREEN,20)
for n,head,body,y in [(1,'OPEN','Start the app on your computer.',143),(2,'ANSWER','Tell it only what you know.',241),(3,'SAVE','Keep a file you can reopen.',339)]:
    label(f'0{n}',674,y,'#B9D4BF');txt(head,713,y-3,170,22,'#FFFFFF','UIB');txt(body,713,y+30,170,14,'#DCEAE0')
callout('No technical or legal knowledge needed','Use made-up information while learning. Ask an IT helper to handle installation if you are unsure.',y=498)

new(2,'Find your route','Try it in your browser.','Public demo: pending the first reviewed deployment. No installation is needed once it is live.')
txt('<link href="https://pvud14.github.io/dpdp-breach-kit/" color="#124D40"><b>https://pvud14.github.io/dpdp-breach-kit/</b></link>',48,179,864,19)
nav('Use the browser demo','Open the address above, then follow the fictional example from page 6.',6,224)
nav('Demo unavailable, or prefer local use?','Get a copy of the project and run it on your own computer.',3,304)
nav('Returning with a saved file?','Reopen your JSON backup and continue.',11,384)
box(48,469,420,110,SAGE);txt('Three words, made simple',66,480,380,17,font='UIB')
txt('<b>Localhost</b> = this computer.<br/><b>Incident</b> = something happened.<br/><b>JSON</b> = the file that lets you resume.',66,511,380,13)
txt('A practice aid, not an official service',500,475,390,17,font='UIB')
txt('Use fictional data. The host receives normal page-request metadata; the app does not transmit your answers.',500,509,390,14)

new(3,'Set up / ask IT if needed','Get the computer ready.','Local setup is optional. Windows steps are shown; any chosen project folder is fine.')
step(1,'Download the project','At <b>github.com/PVUD14/dpdp-breach-kit</b>, choose <b>Code &gt; Download ZIP</b>. Extract the ZIP to a folder you can find.',48,191,410)
step(2,'Open the project folder','Open the extracted folder containing <b>package.json</b>. In File Explorer\'s address bar, type <b>powershell</b> and press Enter. The terminal opens in that folder.',48,318,410)
box(500,184,412,302,'#FFFFFF',14,LINE)
txt('Check the helper programs',522,203,368,20,font='UIB')
txt('Copy each command. Press Enter after each.',522,239,368,14)
command('node --version',522,275,368);command('npm.cmd --version',522,329,368)
txt('<b>You should see:</b> two version numbers.<br/>Project requirement: Node.js 22.12 or later. Ask IT for a compatible installation.',522,390,368,13)
callout('Missing folder or command not recognised?','Ask the project owner or IT helper. Do not disable security settings. Reopen PowerShell after installation.',y=510)

new(4,'Start / PowerShell','Turn the application on.','Run one command at a time. Wait for each of the first three commands to finish.')
rows=[('Check the folder','Get-Item package.json','The terminal must be in the extracted project folder. You should see package.json.'),('Install its tools','npm.cmd ci','First setup: internet is needed. This refreshes the dependency folder.'),('Prepare the app','npm.cmd run build','Wait for a successful build before continuing.'),('Keep the app running','npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort','Leave this window open. The running command is expected.')]
for i,(head,cmd,helptext) in enumerate(rows):
    y=182+i*91;badge(i+1,48,y);txt(head,94,y,220,17,font='UIB');txt(helptext,94,y+27,242,12,color=MUTED);command(cmd,357,y,555)
txt('<b>Success:</b> PowerShell displays <b>http://127.0.0.1:4173/</b>. Keep the server window open.',48,563,864,13)

new(5,'Open / Chrome','Open your local address.','Use Chrome on the same computer where you started the server.')
step(1,'Go to the address bar','Open Chrome. Press <b>Ctrl + L</b>, type the address below, then press Enter.',48,188,400)
command('http://127.0.0.1:4173/',48,282,390)
c.linkURL('http://127.0.0.1:4173/',(48,H-324,438,H-282),relative=0)
step(2,'Start your first record','Click <b>Start a new incident</b>. The first question should appear.',48,355,400)
screenshot('start',478,184,434,310)
label('LOOK FOR THIS BUTTON',498,505,GREEN)
txt('Start a new incident',498,525,390,18,font='UIB')
callout('This is not a public website','Localhost means "this computer". The same address on your phone will not open the app on your PC.',48,510,390)

new(6,'Try it / question 1','Tell it what happened.','Use this fictional story: a pretend work laptop is missing. It may hold 20 pretend customer records.')
step(1,'Choose the closest description','First click <b>Start a new incident</b>. Then choose <b>A device or file is missing</b>. No technical diagnosis is needed.',48,196,350)
step(2,'Continue','Scroll down and click <b>Continue</b>. The next question asks when someone first noticed.',48,340,350)
callout('Unknown is an honest answer','If you do not know, use "I don\'t know yet". Never invent facts to finish the form.',48,493,350)
screenshot('question-1',431,179,481,400)

new(7,'Try it / questions 2 and 3','Unknown is okay. Categories are enough.','For this example, leave the time unknown and choose the kind of information that may be involved.')
box(48,184,420,388,'#FFFFFF',14,LINE);box(492,184,420,388,'#FFFFFF',14,LINE)
label('QUESTION 2',68,201,GREEN);txt('When did you find out?',68,222,380,22,font='UIB')
txt('Click <b>I don\'t know yet</b>.<br/>For real records, use confirmed times in IST.',68,261,380,14)
screenshot('question-2',68,330,380,220)
label('QUESTION 3',512,201,GREEN);txt('What data may be involved?',512,222,380,22,font='UIB')
txt('Tick <b>Names or contact details</b>.<br/>Click <b>Continue</b>. Do not enter actual names.',512,261,380,14)
screenshot('question-3',512,330,380,220)

new(8,'Try it / questions 4 to 6','Finish with what you know.','Use these sample answers only for this fictional walkthrough.')
data=[('04','How many people?','20','Type digits only in <b>About how many people are affected?</b> Then click <b>Continue</b>.'),('05','Still active?','Not sure yet','Leave this selection unchanged. Click <b>Continue</b>. Do not claim the problem has stopped unless confirmed.'),('06','What have you done?','Steps already taken','Type: <b>TRAINING ONLY - I told my manager. IT is checking the missing device.</b> Do not tick "None".')]
for i,(num,head,answer,body) in enumerate(data):
    x=48+i*294;box(x,185,276,292,'#FFFFFF',14,LINE);label(num,x+20,205,GREEN);txt(head,x+20,238,236,22,font='UIB');box(x+18,292,240,58,SAGE,9);txt(answer,x+30,307,216,17,font='UIB');txt(body,x+20,370,236,14)
callout('Your final click: See my response plan','You should reach "You have a place to start." Use Back to correct an answer; do not reload the page.',y=505)

new(9,'Understand / your next steps','Read. Check. Hand it over.','The app helps you organise the next conversation. It does not send anything for you.')
step(1,'Read the three action cards','See who can help: your manager, IT support, privacy lead or legal adviser.',48,190,365)
step(2,'Check your summary','Look for the missing device, information category and count of <b>20</b>. Choose <b>Review my answers</b> to correct them.',48,305,365)
step(3,'Save a readable handoff','Click <b>Save summary for review</b>. This creates a text file for a person to read.',48,440,365)
screenshot('summary',446,185,466,210)
box(446,414,466,157,SAGE)
label('CHECK THESE SAMPLE ANSWERS',466,431,GREEN)
txt('<b>What happened:</b> a device or file is missing.<br/><b>Information:</b> names or contact details.<br/><b>People:</b> 20.',466,460,426,14)
txt('Save the JSON backup too - see the next page.',466,538,426,13,color=GREEN)

new(10,'Save / the most important step','Two files. Two different jobs.','Your answers are not automatically saved. Keep a JSON backup before closing or refreshing.')
for x,tag,head,body,col in [(48,'.JSON','Continue later','Click <b>Save to file</b>.<br/>During the questions, use <b>Save and continue later</b>.<br/><br/>Reopen this file in the app.',SAGE),(492,'.TXT','Share for review','Click <b>Save summary for review</b>.<br/>This creates a readable summary.<br/><br/>This file cannot restore your answers.','#FFFFFF')]:
    box(x,185,420,228,col,14,LINE);label(tag,x+22,205,GREEN);txt(head,x+22,235,376,25,font='UIB');txt(body,x+22,280,376,15)
txt('Check the download really finished',48,441,864,21,font='UIB')
txt('Press <b>Ctrl + J</b> in Chrome. Find the completed file and choose <b>Show in folder</b> if available.<br/>If you did not choose a folder, check <b>Downloads</b>. Save a new JSON copy after changes.',48,478,864,15)
txt('<b>Keep it private:</b> downloads are not automatically encrypted by this app. Use your organisation\'s approved storage.',48,552,864,13,color=MUTED)

new(11,'Return / stop safely','Pick up where you left off.','Hosted demo: reopen its web address. Local app: open PowerShell in the project folder, as on page 3.')
txt('Local use only: confirm the folder, then start preview if it is not already running.',48,187,864,15)
command('npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort',48,234)
box(48,306,420,264,'#FFFFFF',14,LINE);box(492,306,420,264,SAGE)
txt('Reopen your answers',68,325,380,23,font='UIB')
txt('1. Open the hosted demo or your local URL.<br/>2. Click <b>Import an existing incident</b> on the start screen, or <b>Open a saved file...</b> in a session.<br/>3. Choose your <b>.json</b> backup.<br/>4. Check it, edit it and save a new copy.',68,368,380,15,leading=24)
txt('Stop without losing work',512,325,380,23,font='UIB')
txt('1. Save the JSON and check the download.<br/>2. Close the browser tab.<br/>3. Local use only: in the server\'s PowerShell window, press <b>Ctrl + C</b>.<br/>4. If asked to terminate, type <b>Y</b> and press Enter.',512,368,380,15,leading=24)
txt('<b>Code changed?</b> Rebuild before preview. Ask IT whether the dependencies also need updating.',48,580,864,10)

new(12,'Optional / for practice and review','Explore without guessing.', 'Beginners can stop after saving their summary and backup. These options go further.')
box(48,184,420,320,'#FFFFFF',14,LINE);box(492,184,420,320,'#FFFFFF',14,LINE)
label('LEARN SAFELY',70,204,GREEN);txt('Try a built-in exercise',70,238,376,25,font='UIB')
txt('Save your work, then select <b>Start over</b>.<br/><br/>Open <b>Just exploring? Try a fictional example.</b> Choose a scenario and click <b>Start practice</b>.<br/><br/>Use <b>Reveal next update</b> to advance. Add the new facts to your answers yourself.',70,288,376,15)
label('HAND OFF THE DECISIONS',514,204,GREEN);txt('For your reviewer',514,238,376,25,font='UIB')
txt('Choose <b>For your reviewer</b> to see detailed facts, timing assumptions, draft notices and actions.<br/><br/>Use <b>Download response pack</b> for the full readable bundle. Save JSON separately.<br/><br/>Let a qualified reviewer check what applies.',514,288,376,15)
callout('Practice is not a live incident','The exercise clock advances with updates. Practice drafts are marked FICTIONAL PRACTICE - DO NOT SEND.',y=520)

new(13,'Help / common problems','Stuck? Start here.','Try the matching fix. Do not disable security settings or stop an unfamiliar process.')
items=[('Page cannot be reached','Keep preview running. Use http, not https. Open the exact address on the same PC.'),('node or npm not recognised','Ask IT to check installation. Close and reopen PowerShell, then retry the version commands.'),('Scripts are disabled','Use npm.cmd exactly as shown. Do not change your computer\'s execution policy.'),('Port 4173 already in use','Try the page first: the app may be running. Stop only a preview window you recognise.'),('Build fails or the page looks old','Give IT the error, without secrets. After a successful rebuild, save JSON before Ctrl + F5.'),('File rejected or answers lost','Import JSON, not TXT or PDF. Without a downloaded backup, there is no saved copy to restore.')]
for i,(head,body) in enumerate(items):
    y=179+i*57
    if i%2==0:box(48,y,864,53,SAGE,8)
    txt(head,62,y+10,260,14,font='UIB');txt(body,340,y+8,554,13,leading=18)
txt('<b>Alternative port:</b> replace <b>4173</b> with <b>4174</b> in both the preview command and browser address.',48,538,864,13)
txt('Keep rejected files unchanged. Ask your project owner for help rather than editing the backup by hand.',48,566,864,12,color=MUTED)

new(14,'Keep handy / quick reference','Open. Answer. Save.','A successful first run ends with a backup you can reopen.')
checks=['The server is running and the local page opens.','I answered six questions without guessing.','I checked the summary and know who can help.','I saved JSON and confirmed the download.','I reopened the JSON and recognised my answers.']
for i,s in enumerate(checks):
    y=190+i*45;box(48,y+3,18,18,'#FFFFFF',4,LINE);txt(s,82,y,485,15)
box(618,183,294,251,GREEN)
txt('Keep personal<br/>details out.',640,207,250,27,'#FFFFFF','UIB',33)
txt('No real names, email addresses, phone numbers, passwords or account numbers.<br/><br/>Use counts and general descriptions.',640,291,250,15,'#E1EDE5')
txt('A guide, not a guarantee',48,457,864,19,font='UIB')
txt('This application prepares drafts; it is not legal advice. Independent legal review, novice-user testing and desktop/mobile screen-reader testing remain open. A timer or review entry is not certified approval.',48,491,864,13)
txt('App 0.2.0 | Windows local-use guide | Sources: package.json, README.md, src/ui/app.ts, src/ui/workspace.ts and docs/RESPONSE-WORKSPACE.md. Screenshots show a fictional sample in the local application.',48,552,864,10,color=MUTED)
c.save()
assert not errors,errors
print(out)
