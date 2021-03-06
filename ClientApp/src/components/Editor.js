import React, { Component } from 'react'
import * as SignalR from '@microsoft/signalr';
import ReactAce from 'react-ace';
import { Select, MenuItem, InputLabel, FormControl, Grid, Button, LinearProgress } from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareSquare } from '@fortawesome/free-solid-svg-icons';
import ClipBoard from 'clipboard';
import ClipBoardText from './ClipboardText';
import InputDialog from './InputDialog';
import MarkdownPreviewDialog from './MarkdownPreviewDialog';
import Common from '../common';

import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-ruby';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-plain_text';

import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-cobalt';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/theme-eclipse';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-textmate';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/theme-dreamweaver';

import 'ace-builds/src-noconflict/snippets/c_cpp';
import 'ace-builds/src-noconflict/snippets/csharp';
import 'ace-builds/src-noconflict/snippets/java';
import 'ace-builds/src-noconflict/snippets/python';
import 'ace-builds/src-noconflict/snippets/php';
import 'ace-builds/src-noconflict/snippets/ruby';
import 'ace-builds/src-noconflict/snippets/golang';
import 'ace-builds/src-noconflict/snippets/html';
import 'ace-builds/src-noconflict/snippets/css';
import 'ace-builds/src-noconflict/snippets/javascript';
import 'ace-builds/src-noconflict/snippets/markdown';

import 'ace-builds/src-noconflict/ext-language_tools';

export class Editor extends Component {
    static displayName = Editor.name;
    langList = [
        { name: 'C/C++', value: 'c_cpp', compiler: 'gcc-head' },
        { name: 'C#', value: 'csharp', compiler: 'dotnetcore-head' },
        { name: 'Java', value: 'java', compiler: 'openjdk-head' },
        { name: 'Python', value: 'python', compiler: 'cpython-head' },
        { name: 'PHP', value: 'php', compiler: 'php-head' },
        { name: 'Ruby', value: 'ruby', compiler: 'ruby-head' },
        { name: 'Go', value: 'golang', compiler: 'go-head' },
        { name: 'HTML', value: 'html' },
        { name: 'CSS', value: 'css' },
        { name: 'JavaScript', value: 'javascript', compiler: 'nodejs-head' },
        { name: 'Markdown', value: 'markdown' },
        { name: 'Plain Text', value: 'plain_text' }
    ];
    themeList = [
        'monokai',
        'cobalt',
        'terminal',
        'twilight',
        'chrome',
        'eclipse',
        'github',
        'textmate',
        'xcode',
        'dreamweaver'
    ];
    isPressingMetaOrControlKey = false;
    constructor(props) {
        super(props);
        const prevlang = window.localStorage.getItem('prevlang') ? window.localStorage.getItem('prevlang') : 'c_cpp';
        const prevcode = window.localStorage.getItem('prevcode') ? window.localStorage.getItem('prevcode') : '';
        this.state = {
            sessionId: '',
            mode: prevlang,
            theme: 'monokai',
            code: prevcode,
            console: '',
            stdin: '',
            fontSize: 12,
            isRunning: false,
            showInputDialog: false,
            showMarkdownPreviewDialog: false,
            cursorRow: 0,
            cursorCol: 0
        };
        this.execCodeBinded = this.execCode.bind(this);
        this.togglInputDialogBinded = this.togglInputDialog.bind(this);
        this.setStdinBinded = this.setStdin.bind(this);
        this.connection = new SignalR.HubConnectionBuilder().withUrl('/shareHub').build();
        this.connection.start().then(() => {
            console.log('connected');
            const queryParameters = Common.parseQueryString();
            let sessionId = '';
            if ('session' in queryParameters) {
                sessionId = queryParameters.session;
            }
            this.connection.invoke('JoinGroup', { sessionId: sessionId, isEditor: true });
        }).catch(err => {
            console.error(err);
        });
        this.connection.on('Joined', res => {
            console.log(res);
            if (res.succeeded) {
                this.setState({ sessionId: res.sessionId });
                window.history.replaceState('', '', `${window.location.origin}/editor?session=${res.sessionId}`);
                if (prevcode !== '') {
                    this.sendText(prevcode);
                }
                if (prevlang !== '') {
                    this.sendMode(prevlang);
                }
            } else {
                console.error(res.message);
            }
        });
        this.connection.on('JoinNotify', () => {
            this.connection.invoke('SendMessage', this.state.sessionId, JSON.stringify({
                type: 'code',
                data: this.state.code
            })).catch(err => {
                console.error(err);
            });
            this.connection.invoke('SendMessage', this.state.sessionId, JSON.stringify({
                type: 'mode',
                data: this.state.mode
            })).catch(err => {
                console.error(err);
            });
            this.connection.invoke('SendMessage', this.state.sessionId, JSON.stringify({
                type: 'console',
                data: this.state.console
            })).catch(err => {
                console.error(err);
            });
        });
        window.addEventListener('beforeunload', () => {
            console.log('leave');
            this.connection.invoke('LeaveGroup', this.state.sessionId);
        });
        window.addEventListener('keydown', e => {
            switch (e.key) {
                case 'F5':
                    e.preventDefault();
                    this.togglInputDialogBinded(true);
                    break;
                case 'Meta':
                case 'Control':
                    e.preventDefault();
                    this.isPressingMetaOrControlKey = true;
                    break;
                case 'Enter':
                    if (this.isPressingMetaOrControlKey) {
                        e.preventDefault();
                        this.togglInputDialogBinded(true);
                        this.isPressingMetaOrControlKey = false;
                    }
                    break;
                default: break;
            }
        });
        window.addEventListener('keyup', e => {
            switch (e.key) {
                case 'Meta':
                case 'Control':
                    this.isPressingMetaOrControlKey = false;
                    break;
                default:
                    break;
            }
        })
    }
    componentDidUpdate() {
        window.history.replaceState('', '', `${window.location.origin}/editor?session=${this.state.sessionId}`);
    }
    componentWillUnmount() {
        console.log('leave');
        this.connection.invoke('LeaveGroup', this.state.sessionId);
    }

    sendText(sendText) {
        window.localStorage.setItem('prevcode', sendText);
        this.setState({ code: sendText });
        this.connection.invoke('SendMessage', this.state.sessionId, JSON.stringify({
            type: 'code',
            data: sendText
        })).catch(err => {
            console.error(err);
        });
    }
    sendMode(mode) {
        window.localStorage.setItem('prevlang', mode);
        this.setState({ mode: mode });
        this.connection.invoke('SendMessage', this.state.sessionId, JSON.stringify({
            type: 'mode',
            data: mode
        })).catch(err => {
            console.error(err);
        });
    }
    execCode() {
        const compiler = this.langList.find(l => l.value === this.state.mode).compiler;
        if (compiler) {
            this.setState({ isRunning: true }, async () => {
                const res = await fetch('https://wandbox.org/api/compile.json', {
                    method: 'POST',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: this.state.code,
                        compiler: compiler,
                        stdin: this.state.stdin
                    })
                });
                const json = await res.json();
                const current = new Date();
                this.setState(state => {
                    if (json.program_error) {
                        return { console: `[${current.toTimeString().split(' ')[0]}] > ${json.program_error}${state.console}`, isRunning: false }
                    } else if (json.compiler_error) {
                        return { console: `[${current.toTimeString().split(' ')[0]}] > ${json.compiler_error}${state.console}`, isRunning: false }
                    } else if (json.compiler_output) {
                        return { console: `[${current.toTimeString().split(' ')[0]}] > ${json.program_output}\n[${current.toTimeString().split(' ')[0]}] > ${json.compiler_output}${state.console}`, isRunning: false }
                    } else if (json.compiler_message) {
                        return { console: `[${current.toTimeString().split(' ')[0]}] > ${json.program_message}\n[${current.toTimeString().split(' ')[0]}] > ${json.compiler_message}${state.console}`, isRunning: false }
                    } else {
                        return { console: `[${current.toTimeString().split(' ')[0]}] > ${json.program_output}${state.console}`, isRunning: false }
                    }
                }, () => {
                    this.connection.invoke('SendMessage', this.state.sessionId, JSON.stringify({
                        type: 'console',
                        data: this.state.console
                    })).catch(err => {
                        console.error(err);
                    });
                });
            });
        }
    }
    previewMarkdown() {
        this.setState({ showMarkdownPreviewDialog: true });
    }
    togglInputDialog(open = false, exec = false) {
        if (this.state.mode === 'markdown') {
            this.previewMarkdown();
        } else {
            this.setState({ showInputDialog: open }, () => {
                if (exec) {
                    this.execCode();
                }
            });
        }
    }
    setStdin(stdin) {
        this.setState({ stdin });
    }
    render() {
        const shareLink = `${window.location.origin}/viewer?session=${this.state.sessionId}`;
        return (
            <Grid container>
                <Grid item xs={12}>
                    <ClipBoardText clipboard={ClipBoard} value={shareLink}></ClipBoardText>
                </Grid>
                <Grid item xs={12}>
                    <Grid container spacing={2}>
                        <Grid item xs={2}>
                            <FormControl fullWidth>
                                <InputLabel id='lang-select-label'>言語</InputLabel>
                                <Select
                                    labelId='lang-select-label'
                                    id='lang-select'
                                    value={this.state.mode}
                                    onChange={e => this.sendMode(e.target.value)}
                                >
                                    {this.langList.map(l => <MenuItem key={l.value} value={l.value}>{l.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={2}>
                            <FormControl fullWidth>
                                <InputLabel id='theme-select-label'>テーマ</InputLabel>
                                <Select
                                    labelId='theme-select-label'
                                    id='theme-select'
                                    value={this.state.theme}
                                    onChange={e => this.setState({ theme: e.target.value })}
                                >
                                    {this.themeList.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={2}>
                            <FormControl fullWidth>
                                <InputLabel id='font-size-select-label'>フォントサイズ</InputLabel>
                                <Select
                                    labelId='font-size-select-label'
                                    id='font-size-select'
                                    value={this.state.fontSize}
                                    onChange={e => this.setState({ fontSize: e.target.value })}>
                                    {[10, 11, 12, 14, 16, 18, 20, 22, 24].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                            <p>行:{this.state.cursorRow} 列:{this.state.cursorCol} 文字数:{this.state.code.length}</p>
                        </Grid>
                        <Grid item xs={2}>
                            <Button fullWidth color='secondary' variant='contained' onClick={() => this.togglInputDialogBinded(true)} disabled={this.state.isRunning}>▶ 実行</Button>
                            <InputDialog
                                show={this.state.showInputDialog}
                                title='標準入力'
                                togglOpen={this.togglInputDialogBinded}
                                onChangeInput={this.setStdinBinded}
                                defaultValue={this.state.stdin}
                                label='標準入力'
                                okButtonTitle='実行'
                                cancelButtonTitle='キャンセル'
                                rowCount={5}
                            ></InputDialog>
                            <MarkdownPreviewDialog
                                show={this.state.showMarkdownPreviewDialog}
                                code={this.state.code}
                                togglOpen={() => this.setState(state => { return { showMarkdownPreviewDialog: !state.showMarkdownPreviewDialog } })}
                            ></MarkdownPreviewDialog>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item xs={12} style={{
                    marginTop: '8px'
                }}>
                    <ReactAce
                        width='100%'
                        height='420px'
                        mode={this.state.mode}
                        theme={this.state.theme}
                        onChange={v => this.sendText(v)}
                        onCursorChange={c => this.setState({ cursorRow: c.cursor.row, cursorCol: c.cursor.column })}
                        value={this.state.code}
                        fontSize={this.state.fontSize}
                        editorProps={{ $blockScrolling: Infinity }}
                        setOptions={{
                            useWorker: false,
                            enableBasicAutocompletion: true,
                            enableLiveAutocompletion: true,
                            enableSnippets: true,
                        }}
                    >
                    </ReactAce>
                </Grid>
                <Grid item xs={12} style={{
                    marginTop: '8px'
                }}>
                    <InputLabel>標準出力<a href={`/console?session=${this.state.sessionId}`} target='_blank' rel='noopener noreferrer'><FontAwesomeIcon icon={faShareSquare} color='#55B2B8' fixedWidth></FontAwesomeIcon></a></InputLabel>
                    <ReactAce
                        width='100%'
                        height='140px'
                        mode='plain_text'
                        theme='terminal'
                        setOptions={{
                            showLineNumbers: false
                        }}
                        value={this.state.console}
                    ></ReactAce>
                    <LinearProgress style={{ display: this.state.isRunning ? 'block' : 'none' }}></LinearProgress>
                </Grid>
            </Grid>
        )
    }
}