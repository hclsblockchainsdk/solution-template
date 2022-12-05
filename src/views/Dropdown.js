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
import onClickOutside from "react-onclickoutside";

/**
 * USAGE: <Dropdown id="sampleID" classes="sampleClass 1 sampleClass2" title="Select Option" createOptions="sampleFunction"/>
 * * "id" can be used to access various different elements of the Dropdown (wrapper, header, title, list - see state)
 * * "classes": Any number of classes can be added to the wrapper by including them here - separate them with a space
 * * "title" will be the default message on the dropdown
 * * "createOptions" must be a function - it should take a component as a parameter (i.e. 'this') and end with a
 *   self.setState() call that sets 'options'. It should be in the form of a 'li' DOM element. Example:
 *     <li className="dd-list-item" id="someID" onClick={() => self.handleSelect("someID")}><span>Some Option Name</span></li>
 *   className "dd-list-item" and the onClick pointing to self.handleSelect are NECESSARY for proper functionality/css
 *   See AddClaim's createOptionsMake() as an example
 */

class Dropdown extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            listOpen: false,
            wrapperID: this.props.id + "-wrapper",
            headerID: this.props.id + "-header",
            titleID: this.props.id + "-title",
            listID: this.props.id + "-list",
            options: [],
            title: this.props.title
        }
    }

    componentDidMount() {
        this.props.createOptions(this)
    }

    handleClickOutside(evt){
        document.getElementById(this.state.listID).classList.add("hidden")
        document.getElementById(this.state.wrapperID).classList.remove("dd-border")
        this.setState({
            listOpen: false
        })
    }

    handleSelect(id) {
        var thisValue = document.getElementById(id + "-inner").innerHTML
        document.getElementById(this.state.titleID).innerHTML = thisValue
        document.getElementById(this.state.titleID).value = thisValue
        this.toggleList()
    }
      
    toggleList(){
        if (this.state.listOpen) {
            document.getElementById(this.state.listID).classList.add("hidden")
            document.getElementById(this.state.wrapperID).classList.remove("dd-border")
        } else {
            document.getElementById(this.state.listID).classList.remove("hidden")
            document.getElementById(this.state.wrapperID).classList.add("dd-border")
        }
        this.setState(prevState => ({
            listOpen: !prevState.listOpen
        }))
    }

    render() {
        return(
            <div className={"dd-wrapper " + this.props.classes} id={this.state.wrapperID}>
                <div className="dd-header" id={this.state.headerID} onClick={() => this.toggleList()}>
                    <div className="dd-header-title" id={this.state.titleID}>{this.state.title}</div>
                </div>
                <ul className="dd-list hidden" id={this.state.listID}>
                    {this.state.options}
                </ul>
            </div>
        )
    }
}

export default onClickOutside(Dropdown)