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
import DatePicker from 'react-datepicker'
import moment from 'moment'
import NavBarTop from './NavBarTop'

import { InputError, ErrorMsg, SuccessMsg } from './FeedbackMessages'
import { sign } from './SignRequests'
import Dropdown from './Dropdown'
import 'react-datepicker/dist/react-datepicker.css';

class AddClaim extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            updateDate: moment(),
        }
        this.updateClaim = this.updateClaim.bind(this)
    }

    createOptionsMake(self) {
        // Hard coded for now
        var makeOptions = [
            {
                index: 1,
                name: "Surgery",
                value: "Surgery"
            },
            {
                index: 2,
                name: "Lasik",
                value: "Lasik"
            },
            {
                index: 3,
                name: "Physical",
                value: "Physical"
            }
        ]
        var options = makeOptions.map(function(option) {
            var id = self.props.id + "-item-" + option.index.toString()
            return (<li className="dd-list-item" id={id} value={option.value} onClick={() => self.handleSelect(id)}> <span id={id + "-inner"}>{option.name}</span></li>)
        })
        self.setState({
            options: options
        })
    }

    updateClaim(date) {
        this.setState({
            updateDate: date
        })
    }

    handleInputError(id, isValue) {
        if (isValue === false || isValue === undefined) {
            document.getElementById(id).classList.add("boxError")
            document.getElementById(id).classList.remove("hidden")
            return false
        } else {
            document.getElementById(id).classList.remove("boxError")
            document.getElementById(id).classList.add("hidden")
            return true
        }
    }

    addClaim(e) {
        e.preventDefault();

        document.getElementById("addClaimError").classList.add("hidden")
        document.getElementById("addClaimSuccess").classList.add("hidden")

        var fetchFlag = true
        var token = localStorage.getItem("token") ? localStorage.getItem("token") : sessionStorage.getItem("token");
        var username = localStorage.getItem("username") ? localStorage.getItem("username") : sessionStorage.getItem("username");

        var claimID = document.getElementById("claimID").value 
        var episode = document.getElementById("addClaim-episode-dd-title").value
        var payer = document.getElementById("payer").value
        var provider = document.getElementById("provider").value
        var updateDate = document.getElementById("updateDate") ?  new Date(document.getElementById("updateDate").value).getTime() / 1000: false

        fetchFlag = this.handleInputError("reqClaimID", claimID) ? fetchFlag : false
        fetchFlag = this.handleInputError("reqEpisode", episode) ? fetchFlag : false
        fetchFlag = this.handleInputError("reqPayer", payer) ? fetchFlag : false
        fetchFlag = this.handleInputError("reqProvider", provider) ? fetchFlag : false
        fetchFlag = this.handleInputError("reqUpdateDate", updateDate) ? fetchFlag : false
        
        if (fetchFlag) {
            var body = JSON.stringify({
                "claim_id": claimID,
                "episode": episode,
                "payer": payer,
                "provider": provider,
                "update_date": updateDate,
            })

            let signature = sign(username, "/solution/api/v1/claims", body);
            fetch("/solution/api/v1/claims", {
                method: "POST",
                headers: {
                    "token": token,
                    "signature": signature,
                    'Content-Type': 'application/json'
                },
                body: body
            })
            .then(function(response) {
                console.log(response)
                if (response.status === 201) {
                    document.getElementById("addClaimSuccess-msg").innerHTML = "Claim added successfully: "
                    document.getElementById("addClaimSuccess-msgDetail").innerHTML = "Claim ID " + claimID
                    document.getElementById("addClaimSuccess").classList.remove("hidden")
                } else {
                    document.getElementById("addClaimError-msg").innerHTML = "Add claim failure: "
                    document.getElementById("addClaimError-msgDetail").innerHTML = "Status " + response.status
                    document.getElementById("addClaimError").classList.remove("hidden")
                }
                response.json()
            })

        } else {
            document.getElementById("addClaimError-msg").innerHTML = "Error in form: "
            document.getElementById("addClaimError-msgDetail").innerHTML = "Please fill out the required fields"
            document.getElementById("addClaimError").classList.remove("hidden")
        }
    }

    cancel(e) {
        e.preventDefault();
    }

    render() {
        return (
            <div>
                <NavBarTop active="claim"/>
                <div id="addClaimPage">
                    <h1 className="pageHeader">Add Claim</h1>
                    <div id="claimContainer">
                        <SuccessMsg id="addClaimSuccess"/>
                        <form onSubmit={this.addClaim.bind(this)}>
                            <p className="claimSubHead" id="claimDetails">Claim Details</p>
                            <div className="row">
                                <div className="col-md-6">
                                    <label> Claim ID
                                        <input id="claimID" type="text" className="claimInput"/>
                                    </label>
                                    <InputError id="reqClaimID" text="Required field" type="addClaimReqField"/>
                                </div>
                                <div className="col-md-6">
                                    <label> Episode
                                        <Dropdown id={"addClaim-episode-dd"} classes={"claimBottomMargin"} createOptions={this.createOptionsMake}/>
                                    </label>
                                    <InputError id="reqEpisode" text="Required field" type="addClaimReqField"/>
                                </div>
                                <div className="col-md-6">
                                    <label> Payer
                                        <input id="payer" type="text" className="claimInput"/>
                                    </label>
                                    <InputError id="reqPayer" text="Required field" type="addClaimReqField"/>
                                </div>
                                <div className="col-md-6">
                                    <label> Provider
                                        <input id="provider" type="text" className="claimInput"/>
                                    </label>
                                    <InputError id="reqProvider" text="Required field" type="addClaimReqField"/>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-3">
                                    <label> Last update
                                        <DatePicker selected={this.state.updateDate} onChange={this.updateClaim} id="updateDate"
                                        className="claimInput datePicker"/>
                                    </label>
                                    <InputError id="reqUpdateDate" text="Required field" type="addClaimReqField"/>
                                </div>
                            </div>
                            <ErrorMsg id="addClaimError"/>
                            <div id="claimButtons">
                                <button id= "cancelClaim" className="secondaryButton" onClick={this.cancel.bind(this)}>Cancel</button>
                                <input type="submit" value="Submit Claim" id="submitClaim" className="primaryButton"/>  
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )
    }
}

export default withRouter(AddClaim)