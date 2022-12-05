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
import { Link, withRouter } from 'react-router-dom'
import { logout } from '../Helper'

class NavBarTop extends React.Component {
    constructor(props){ 
        super(props)
        this.logout = logout.bind(this);
    }

    componentDidMount() {
        var active = this.props.active

        switch(active){
            case "dashboard":
                document.getElementById("dashboardLink").classList.add("navBarSelected")
                document.getElementById("dashboardLink-style").classList.remove("hidden")
                break
            case "claim":
                document.getElementById("addClaimLink").classList.add("navBarSelected")
                document.getElementById("addClaimLink-style").classList.remove("hidden")
                break
            default:
                break
        }
    }


    render() {
        return(
            <div className="navBarTop">
                <div className="hamburger"/>
                <span className="floatLeft">Solution Template</span>
                <ul>
                    <li id="dashboardLink" className="floatLeft">
                        <Link to="/dashboard">Dashboard</Link>
                        <div id="dashboardLink-style" className="underlineSelected hidden"/>
                    </li>
                    <li id="addClaimLink" className="floatLeft">
                        <Link to="/addClaim">Add Claim</Link>
                        <div id="addClaimLink-style" className="underlineSelected hidden"/>
                    </li>
                </ul>
                <div class="navBarIcons">
                    <div className="searchIcon"/>
                    <div className="settingsIcon"/>
                    <div className="profileIcon" onClick={this.logout}/>
                </div>
            </div>
        )
    }
}

export default withRouter(NavBarTop)