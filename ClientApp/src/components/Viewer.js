import React, { Component } from 'react'
import * as SignalR from '@microsoft/signalr';
import ReactAce from 'react-ace';
import { Select, MenuItem, InputLabel, FormControl, Grid } from '@material-ui/core';
import InputDialog from './InputDialog';
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


export class Viewer extends Component {
    static displayName = Viewer.name;
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
    constructor(props) {
        super(props);
        this.state = {
            mode: 'c_cpp',
            theme: 'monokai',
            receiveText: '',
            sessionId: '',
            showSessionIdInputDialog: false
        };
        this.togglInputDialogBinded = this.togglInputDialog.bind(this);
        this.setSessionIdBinded = this.setSessionId.bind(this);
        this.connection = new SignalR.HubConnectionBuilder().withUrl("/shareHub").build();
        this.connection.on('ReceiveMessage', message => {
            const msg = JSON.parse(message);
            if (msg.type === 'code') {
                this.setState({ receiveText: msg.data });
            } else if (msg.type === 'mode') {
                this.setState({ mode: msg.data });
            }
        });
        this.connection.start().then(() => {
            console.log('connected');
            const queryParameters = Common.parseQueryString();
            if ('session' in queryParameters) {
                this.connection.invoke('JoinGroup', { sessionId: queryParameters.session, isEditor: false });
                this.setState({ sessionId: queryParameters.session });
            } else {
                console.warn('not set session id');
                this.setState({ showSessionIdInputDialog: true });
            }
        }).catch(err => {
            console.error(err);
        });
    }

    togglInputDialog(open = false, joinSession = false) {
        this.setState({ showSessionIdInputDialog: open }, () => {
            if (joinSession) {
                window.history.replaceState('', '', `${window.location.origin}/viewer?session=${this.state.sessionId}`);
                this.connection.invoke('JoinGroup', { sessionId: this.state.sessionId, isEditor: false });
            }
        });
    }
    setSessionId(sessionId) {
        this.setState({ sessionId: sessionId });
    }

    render() {
        return (
            <Grid container>
                <Grid item xs={12}>
                    <Grid container spacing={2}>
                        <Grid item xs={3}>
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
                    </Grid>
                </Grid>
                <Grid item xs={12}>
                    <ReactAce
                        width='100%'
                        mode={this.state.mode}
                        theme={this.state.theme}
                        value={this.state.receiveText}
                        readOnly={true}
                        setOptions={{
                            useWorker: false
                        }}
                    >
                    </ReactAce>
                </Grid>
                <InputDialog
                    title='セッションID'
                    show={this.state.showSessionIdInputDialog}
                    label='セッションID'
                    onChangeInput={this.setSessionIdBinded}
                    togglOpen={this.togglInputDialogBinded}
                    okButtonTitle='OK'
                    cancelButtonTitle='キャンセル'
                    rowCount={1}
                ></InputDialog>
            </Grid>
        )
    }
}