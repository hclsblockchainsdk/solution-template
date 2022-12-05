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
import Login from './Login'
import Dashboard from './Dashboard'

// =========================================================================
// Index, should route either to Login or Home depending on logged in status
// =========================================================================
const Index = () => {
    if (localStorage.getItem("username") || sessionStorage.getItem("username")) {
        return(
            <Dashboard/>
        );
    } else {
        return (
            <Login/>
        )
    }
}

export default Index