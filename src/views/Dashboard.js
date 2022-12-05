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
import NavBarTop from './NavBarTop'
import './Dashboard.css'
import { getDate, logout } from '../Helper'

import ReactTable from "react-table"
import "react-table/react-table.css";
import { sign } from './SignRequests'

// Dashboard UI component
class Dashboard extends React.Component {
    constructor(props) {
        super(props);
        this.logout = logout.bind(this);
    }

    render() {
        return (
            <div>
                <div id="pageFade" className="hidden" />
                <NavBarTop active="dashboard" />
                <div className="reportsPage">
                    <h1 className="pageHeader">Dashboard</h1>
                    <div className="claimContainer">
                        <p className="sectionHeader">Claims</p>
                        <Claims logout={this.logout} />
                    </div>
                </div>
            </div>
        );
    }
}


// Claims table
class Claims extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            claims: [],
            pageStartKeys: [""],
            pages: 1,
            defaultPageSize: 10,
            loading: true
        };
        this.logout = logout.bind(this);
        this.fetchClaims = this.fetchClaims.bind(this);
    }

    fetchClaims(state, instance) {
        var self = this;
        // Whenever the table payer changes, or the user sorts or changes pages, this method gets called and passed the current table.
        // You can set the `loading` prop of the table to true to use the built-in one or show you're own loading bar if you want.
        this.setState({ loading: true });
        var token = localStorage.getItem("token") ? localStorage.getItem("token") : sessionStorage.getItem("token");
        var username = localStorage.getItem("username") ? localStorage.getItem("username") : sessionStorage.getItem("username");

        let api_path = "/solution/api/v1/claims?limit=" + this.state.defaultPageSize + "&last_key=" + this.state.pageStartKeys[state.page];
        let signature = sign(username, api_path, "");
        
        // Call GET claims API to get claim page and set them in component state.
        fetch(api_path, {
            method: "GET",
            headers: {
                "token": token,
                "signature": signature
            }
        }).then(response => response.json()
        ).then(function (data) {
            if (data.status === 401) {
                self.logout();
            }

            // Update the array of page start keys
            var newPageStartKeys = self.state.pageStartKeys;
            newPageStartKeys[state.page + 1] = escape(data.lastKey);

            var maxPages = self.state.pages;
            if (data.claimPage.length < self.state.defaultPageSize) {
                // If this page isn't full, this is the last page. Update the max page num.
                maxPages = state.page + 1;
            } else if (state.page + 1 === maxPages) {
                // If the page is full and the max num pages has been reached, increase the max
                maxPages++;
            }

            self.setState({
                claims: data.claimPage,
                pageStartKeys: newPageStartKeys,
                loading: false,
                pages: maxPages
            });
        });
    }

    render() {
        const columns = [{
            Header: 'Claim ID',
            accessor: 'claim_id',
            width: 200
        }, {
            Header: 'Episode',
            accessor: 'episode',
            width: 200
        }, {
            Header: 'Payer',
            accessor: 'payer',
            width: 200
        }, {
            Header: 'Provider',
            accessor: 'provider',
            width: 200
        }, {
            Header: 'Update Date',
            id: 'update_date',
            accessor: d => getDate(d.update_date),
            maxWidth: 200
        }]
        return (
            <ReactTable
                defaultPageSize={this.state.defaultPageSize}
                showPageSizeOptions={false}
                sortable={false}
                data={this.state.claims}
                pages={this.state.pages}
                loading={this.state.loading}
                manual // informs React Table that you'll be handling sorting and pagination server-side
                columns={columns}
                onFetchData={this.fetchClaims} // Request new data when things change
            />
        );
    }
}

export default Dashboard