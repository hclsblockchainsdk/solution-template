/*******************************************************************************
 * IBM Confidential
 * 
 * OCO Source Materials
 * 
 * Copyright IBM Corp. 2019, 2020
 * 
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U.S. Copyright Office.
 *******************************************************************************/

import React from 'react'
import { withRouter } from 'react-router-dom'
import { InputError } from './FeedbackMessages'
import { sign } from './SignRequests'

const Login = (props) => {
    let user, pass

    const login = e => {
        e.preventDefault();
        localStorage.removeItem("username")
        localStorage.removeItem("token")
        let id, org, channel
        let userval = user.value.split("/");
        if (userval.length >= 1) {
            id = userval[0];
        }
        if (userval.length >= 2) {
            org = userval[1];
        }
        if (userval.length >= 3) {
            channel = userval[2]
        }
        let signature = sign(id, "/common/api/v1/login", "");
        fetch("/common/api/v1/login", {
            method: "GET",
            headers: {
                "user-id": id,
                "password": pass.value,
                "login-org": org,
                "login-channel": channel,
                "signature": signature
            }
        })
            .then(response => response.json())
            .then(function(data) {
                if (data.id) {
                    if (document.getElementById("rememberMe").checked === true) {
                        localStorage.setItem("username", data.id)
                        localStorage.setItem("token", data.token)
                    } else {
                        sessionStorage.setItem("username", data.id)
                        sessionStorage.setItem("token", data.token)
                    }
                    props.history.push("/");
                } else {
                    document.getElementById('incorrectPass').classList.add("boxError")
                    document.getElementById('incorrectPass').classList.remove("hidden")
                    console.log(data.msg)
                }
            })
    }
    return(
        <div id="loginContainer">
            <div id="loginTitle">
                <div id="welcome">Welcome to</div>
                <div id="bundled">Solution Template</div>
            </div>
            <div id="loginForm">
                <form onSubmit={login}>
                    <label className="loginLabel"> Username
                        <input id="username" type="text" className="loginBox" autocomplete="off" ref = {node => user = node}/>
                    </label>
                    <label className="loginLabel"> Password
                        <input id="password" type="password" className="loginBox" autocomplete="off" ref = {node => pass = node}/>
                    </label>
                    <InputError id="incorrectPass" type="incorrectPass" text="Incorrect password"/>
                    <div id="loginOptions">
                        <span id="loginCheck">
                            <input type="checkbox" id="rememberMe"/>
                            <label for="rememberMe" className="checker"><span className="checkerLabel">Remember Me</span></label>
                        </span>
                        <span id="forgotPass">Forgot Password?</span>
                    </div>
                    <input id="loginSubmit" className="primaryButton" type="submit" value="Sign In" />  
                </form>
                <div id="logo"/>
            </div>
        </div>
    )
}

export default withRouter(Login)