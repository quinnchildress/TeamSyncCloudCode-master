// Deployed by karsh X @ Fri 1:47 PM
var Stripe = require('stripe');
Stripe.initialize('sk_test_oG4972Grob0VQjt1AXyzgYzF');// Warning: Secret KEY!!

var Mailgun = require('mailgun');
Mailgun.initialize('sandboxf9bfc87f52304e0a8fcda5376ad96404.mailgun.org', 'key-96d90b889d298c256aeb883d6399de04');

Parse.Cloud.define("test", function(request, response) {
	console.log("Parse Cloud Code Works!");
  	response.success("cool");
});

// ----------- Request Objects -----------
Parse.Cloud.define("requestAdminAccount", function(request, response) 
{
	var schoolName      = request.params.schoolName;
    var locationAddress = request.params.locationAddress;
    var district        = request.params.district;
    var email           = request.params.email;
    var phone           = request.params.phone;
    var name            = request.params.name;
    
    var RequestObject = Parse.Object.extend("Requests");
    var request = new RequestObject();

    request.set("schoolName", schoolName);
    request.set("locationAddress", locationAddress);
    request.set("district", district);
    request.set("email", email);
    request.set("name", name);
    request.set("phone", phone);
    console.log('* Saving Request....');
    
    request.save(null, 
    {
        success: function(request) 
        {
            console.log("* Request saved");

            // Send Email
            var emailSubjectString = 'Hey ' + name + '! '+ 'Thank you for signing up for TeamSync.';
            var textString = 'We can\'t wait to get you started with TeamSync. \n\nOne of our team members will be in contact with you shortly to guide you through the setup process and make sure you\'re satisfied with every step.\n\n' + 'We have a strong commitment to help sport lovers feel the love and passion behind the game.\n\nBest Regards,\n-Your friends at TeamSync.';
            var recipientString = email + ',' + 'orders@teamsyncweb.com,' + 'quinn@teamsyncweb.com,' + 'kyle@teamsyncweb.com,' + 'dilip@teamsyncweb.com'; 

            console.log('* Email Recipients ' + recipientString);

            Parse.Cloud.run('email', {"emailTo":recipientString,"subject":emailSubjectString,"text": textString},{
                success: function(result) 
                {
                    console.log("* Email Sent!");
                    response.success("$ Email Sent!");
                },
                error: function(error) 
                {
                    console.log("* Email Returned Error" + error.message);
                    response.error(error);
                }
            });
      },
      error: function(request, error) 
        {
          console.error("* Request FAILED TO SAVE "+ error.message);
          response.error(error.message);
        }
    });
});

// ----------- Before Save Team ------------
Parse.Cloud.beforeSave("Team", function(request, response)
{  
    console.log('===== Before Save Team ========');
    var ghost = request.object.get('ghost');
    var team = request.object;
    
    if (ghost == true)
    {
        console.log('* Ghost Team');
        // Send email to self!
        
        team.set('teamWins', 0);
        team.set('teamLosses', 0);

        team.set('scorekeepers', []);
        team.set('subscribers', []);
        team.set('games', []);        
    }
    
    response.success();
});

// ----------- After Save Team ------------
Parse.Cloud.afterSave("Team", function(request) {
	var thisObject = request.object;
    console.log("====== AFTER SAVE TEAM =========");
    
	var querySchool = thisObject.get('school');
	// Add Schools' teams
	querySchool.fetch(
        {
          success: function(school) {
            
              console.log('* Query Success: School found');
              school.addUnique('teams', thisObject);
              
              school.save(null, {
                  success: function(school) {
                    console.log('* Added to school teams successfully!\n*# School Saved!');
                  },
                  error: function(school, error) 
                  {
                    console.error('* ## Couldnt save school!' + error.message);                  }
                });
          },
          error: function(school, error) {
            console.error('* Error: could not fetch school');
          }
        });
});

// ----------- Before Save Game ------------
/*
Parse.Cloud.beforeSave("Game", function(request, response){
    var thisUser = Parse.User.current();
	var thisObject = request.object;

    // Save Game
    thisObject.set("inProgress",1);
    thisObject.set("createdBy", thisUser);
    
    // CREATE Home Score Objects
    var homeScoreObj = Parse.Object.extend("Score_basketball");
    var gameScore = new homeScoreObj();
    gameScore.set("score", 0);
    gameScore.set("quarterScore1", 0);
    gameScore.set("quarterScore2", 0);
    gameScore.set("quarterScore3", 0);
    gameScore.set("quarterScore4", 0);
    gameScore.set("homeTeam", true);

    thisObject.set("homeTeamScore", gameScore);                // Home Game Score
    
    gameScore.save(null, {
      success: function(gameScore) {
            console.log("* home game score saved");

            var awayScoreObj = Parse.Object.extend("Score_basketball");
            var awayScore = new awayScoreObj();
            awayScore.set("score", 0);
            awayScore.set("quarterScore1", 0);
            awayScore.set("quarterScore2", 0);
            awayScore.set("quarterScore3", 0);
            awayScore.set("quarterScore4", 0);
            awayScore.set("homeTeam", false);
          
            thisObject.set("awayTeamScore", awayScore);         // Away Game Score							

            awayScore.save(null, {
                success: function(awayScore) {
                     console.log("* away game score saved");
                     console.log("## GAME Save SUCCESSFUL! ##");
                    // SUCESS
                    response.success();
                },
                error: function(awayScore, error) {
                    console.error("* away game score failed to save" + error.message);
                    // FAIL
                    response.error();
                }
            });
        },
        error: function(gameScore, error) {
                    console.error("* home game score failed to save" + error.message);
                    response.error();
        }
    });	
});
*/


// ----------- After Save Game -------------
Parse.Cloud.afterSave("Game", function(request) {

    var thisUser = Parse.User.current();
	var thisObject = request.object;

    console.log("====== AFTER SAVE GAME =========");
    
	var queryTeam = thisObject.get("awayTeamID");
	// Add to Away Team
	queryTeam.fetch({  
		success: function(awayTeam){
			awayTeam.addUnique("games", thisObject);
			awayTeam.save();
            console.log("* away team fetched and linked");

			// Add to Home Team
      		var queryHomeTeam = thisObject.get("homeTeamID");
			queryHomeTeam.fetch({
				success: function(homeTeam){
					homeTeam.addUnique("games", thisObject);
					homeTeam.save();										
                    
                    // Home Score Link
                    var queryHomeScore = thisObject.get("homeTeamScore");
                    queryHomeScore.fetch({
                        success: function(homeScore){ 
                            homeScore.set("game", thisObject);
                            console.log("* home score linked to game!");
                            
                            // Away Score Link
                            var queryAwayScore = thisObject.get("awayTeamScore");
                            queryAwayScore.fetch({
                                success: function(awayScore){ 
                                    awayScore.set("game", thisObject);
                                    console.log("* away score linked to game!");
                                    
                                    console.log("*** GAME SAVE PROCESS COMPLETE *** :Karsh is a true G");
                                },
                                error: function(awayScore, error){
                                    console.error("* query error: away score could not be fetched");        
                                }
                       
                            });
                            
                        },
                        error: function(homeScore, error){
                            console.error("* query error: home score could not be fetched");        
                        }
                       
                    });
                
                },
                error: function(homeTeam, error)
                {
                    console.error("* query error: home team could not be fetched");
                }
            });
        },
        error: function(awayTeam, error)
        {
            console.error("* query error: could not fetch away team");
        }
    });

});

/*
Parse.Cloud.afterSave("Score_basketball", function(request) {
    var thisUser = Parse.User.current();
	var thisObject = request.object;

    console.log("** After Save Score \t" + " ====== STAUTS: existed= " + thisObject.isNew()  + " ========= ");
    
    var queryGame = thisObject.get("game");
    
    queryGame.fetch({
          success: function(gameObject) {
            console.log("* game fetched");
            
            if (thisObject.get("homeTeam") == true)
            {
                console.log("* adding pointer to original game object \t field: home");
                gameObject.set("homeTeamScore", thisObject); 
                
                gameObject.save(null, {
                      success: function(gameScore) {
                        console.log("* original game object saved");
                      },
                      error: function(gameScore, error) {
                        console.error("* original game object could NOT SAVE! \t reason:" + error.message);
                      }
                });
            }
            else
            {
                console.log("* adding pointer to original game object \t field: away");
                gameObject.set("awayTeamScore", thisObject); 
                
                gameObject.save(null, {
                      success: function(gameScore) {
                        console.log("* original game object saved");
                      },
                      error: function(gameScore, error) {
                        console.error("* original game object could NOT SAVE! \t reason:" + error.message);
                      }
                });
            }
             
          },
          error: function(gameObject, error) {
            console.error("* game fetch failed \treason:" + error.message);
          }
    });
    
});
*/

//afterDelete triggger that removes references to deleted game in the correponding teams as well as deletes the score objects connected to the game
Parse.Cloud.afterDelete("Game", function(request){
	//delete score objects
	var queryAwayScore = request.object.get("awayTeamScore");

	queryAwayScore.fetch({
		success: function(awayScore){
			awayScore.destroy({
			  success: function(myObject) {

			    	var queryHomeScore = request.object.get("homeTeamScore");

					queryHomeScore.fetch({
						success: function(homeScore){
							homeScore.destroy({
							  success: function(myObject) {

							    // The object was deleted from the Parse Cloud.

							    //delete reference to game in the team objects
								var queryTeam = request.object.get("awayTeamID");

								queryTeam.fetch({
									success: function(awayTeam){

										console.log("Success in Fetching awayTeam Object. Destroying Now.");

										awayTeam.remove("games", request.object);
										awayTeam.save();

							      		var queryTeam = request.object.get("homeTeamID");

										queryTeam.fetch({
											success: function(homeTeam){

												console.log("Success in Fetching homeTeam Object. Destroying Now.");


												homeTeam.remove("games", request.object);
												homeTeam.save();
											},
											error: function(homeTeam, error){
												console.error("Error removing game from homeTeam array! " + error.code + ": " + error.message);
											}
										});
									},
									error: function(myObject, error){
										console.error("Error removing game from awayTeam array! " + error.code + ": " + error.message);
									}

								});


							  },
							  error: function(myObject, error) {
							    // The delete failed.
							    // error is a Parse.Error with an error code and message.
							    console.error("Error deleting homeTeamScore " + error.code + ": " + error.message);
							  }
							});
						}

					});
			  },
			error: function(myObject, error) {
			    // The delete failed.
			    // error is a Parse.Error with an error code and message.
          		console.error("Error deleting awayTeamScore " + error.code + ": " + error.message);
			  }
			});
		}

	});

});

Parse.Cloud.define("sendPushToUser", function(request, response) {
  var senderUser = request.user;
  var channel = request.params.channel;
  var message = request.params.message;

/* Potential For Fututre Implementation. */

  // // Validate that the sender is allowed to send to the recipient.
  // // For example each user has an array of objectIds of friends
  // if (senderUser.get("friendIds").indexOf(recipientUserId) === -1) {
  //   response.error("The recipient is not the sender's friend, cannot send push.");
  // }

  // // Validate the message text.
  // // For example make sure it is under 140 characters
  // if (message.length > 140) {
  // // Truncate and add a ...
  //   message = message.substring(0, 137) + "...";
  // }

  Parse.Push.send({
	  	channels: [channel],
	 	 data: {
	 	   alert: message
	 	 }
	  },
	 {
	  success: function() {
	      response.success("Push was sent successfully.")
	  },
	  error: function(error) {
	      response.error("Push failed to send with error: " + error.message);
	 }
  });
  
});

/* ---------------------- Server Functions -----------------------------*/
// EMAIL Function
Parse.Cloud.define("email", function(request, response)
{
    console.log("** ==== email invoked on the cloud ==== **");
    
    var emailTo = request.params.emailTo;
    var subject = request.params.subject;
    var text = request.params.text;
    
    console.log("* email to: " + emailTo);
    console.log("* subject: " + subject);
    console.log("* text: " + text);

    Mailgun.sendEmail({
          to: emailTo,
          from: "orders@teamsyncweb.com",
          subject: subject,
          text: text
    }, {
        success: function(httpResponse) 
        {
            console.log("* Email Success! ");
            //console.log(httpResponse);
            response.success("Email sent!");
        },
        error: function(httpResponse) 
        {
            console.error("ERROR: " + httpResponse);
            response.error(httpResponse);
        } 
    });   

});

// PAYMENT FUNCTION
Parse.Cloud.define("charge", function(request, response) {

  var token = request.params.token;
  var amount = request.params.amount;
  var dollarAmount = amount/100;
  var descriptionText = request.params.description;
  var cardHolderName = request.params.cardholdername;
  var emailAddress = request.params.email;
    
  console.log("#Running payment with: \n*token: \t" + token + "\n*amount: \t" + amount + "\n*description: \t" + descriptionText + "\n*Card Holder Name: \t" + cardHolderName);
    
  Stripe.Charges.create({
    amount:       amount,               // In cents
    currency:     "usd",
    card:         token,
    description:  descriptionText,
  },{
    success: function(httpResponse) {
      console.log("$$ payment success $$" + "-What A G");

        var emailPaymentSubjectText = 'Hello '+ cardHolderName + '! Your order is being processed.';
        var textString = 'Your credit card statement will include an invoice of $' + dollarAmount + '.\nOrder description: ' + descriptionText + '\n\nThankyou for using Team Sync in your schools.\nWe hope you have a record setting year\n\nFor any help, questions, setup, or just to voice your opinion please dont hesitate to email us at support@teamsyncweb.com\n\n-Your friends at Team Sync :)';
        
        Parse.Cloud.run('email', {"emailTo":emailAddress,"subject":emailPaymentSubjectText,"text": textString}, {
            success: function(result) 
            {
                console.log("* Email Sent!");
                response.success("$ Payment Successful, Email Sent!");
            },
            error: function(error) 
            {
                console.log("* Email Returned Error" + error.description);
                response.success("$ Payment Successful, Email NOT SENT!");
            }
        });
    },
    error: function(httpResponse) {
      console.error(" --- Uh oh, something went wrong" + "\terror message: "+ httpResponse + " --- ");
      response.error("Error: "+ httpResponse);
    }
  });

});