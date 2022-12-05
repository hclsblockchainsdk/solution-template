# JMeter Test Suite

TestPlan.jmx is our regression test suite, which is built using the JMeter application.

## Installation and Setup

Download JMeter: http://jmeter.apache.org/download_jmeter.cgi

Once downloaded, extract the file and navigate to the bin directory.

For Mac/Linux/Unix: ```./jmeter.sh```  
For Windows: ```jmeter.bat```

## Running the Tests

After JMeter starts, open TestPlan.jmx in this directory (solution_template/test_suite/).

Each Thread Group contains the tests for one category of our RESTful API.  To run the tests for a particular Thread Group, right-click the Thread Group and select "enable".  Any number of Thread Groups can be enabled at one time.  

Select Run > Start to run the tests for the enabled Thread Groups.

To view the results of the tests, click on the Results Tree, which is the last element within each Thread Group.  Passing tests are indicated with a green check mark, and failing tests are indicated with a red X.

Clicking on an individual test within the Results Tree allows you to view both the Request and the Response data.  In the case of a test failure, click on the arrow next to the test to view the particular assertion that caused it to fail.

To re-run the tests for a Thread Group, either restart the network, or change the value of test_run in the Test Run Variable element at the top of the Thread Group.