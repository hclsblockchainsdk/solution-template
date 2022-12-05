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
import { withRouter, Link } from 'react-router-dom'

const Home = (props) => {
    const logout = () => {
        localStorage.removeItem("username")
        sessionStorage.removeItem("username")
        localStorage.removeItem("token")
        sessionStorage.removeItem("token")
        props.history.push("/");
    }
    const username = localStorage.getItem("username") ? localStorage.getItem("username") : sessionStorage.getItem("username")
    return (
        <div>
            <h2>Solution Template Home</h2>
            <p>Welcome {username}</p>
            <button onClick={logout}>Log Out</button>
            <Link to="/dashboard">Dashboard </Link>
        </div>
    )
}

export default withRouter(Home)

